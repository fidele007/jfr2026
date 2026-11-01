import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { loadSearchExtractor, searchModelProfile } from './search-extractor.mjs';
import { medicalTopics, unrelatedTopics } from '../src/lib/search-domain.mjs';
import { loadSearchDocuments } from './search-documents.mjs';

const model = process.argv[2] || 'onnx-community/embeddinggemma-300m-ONNX';
const revision = process.argv[3] || '5090578d9565bb06545b4552f76e6bc2c93e4a66';
const profile = searchModelProfile(model, revision, process.argv[6] || 'q8');
if (process.argv[5]) profile.pooling = process.argv[5];
const { pooling, queryPrefix, passagePrefix, dtype } = profile;
const outputPath = process.argv[4] || 'data/search/index.json';
const source = await readFile('static/json/event.json');
const items = JSON.parse(source).data.event.search.items.filter(x => !x.title.startsWith('Session test'));
let previous;
try { previous = JSON.parse(await readFile(outputPath, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const reusable = previous?.version === 3 && ['model', 'revision', 'pooling', 'queryPrefix', 'dtype'].every(key => previous[key] === profile[key]);
const previousPositions = new Map(reusable ? previous.ids.map((id, index) => [id, index]) : []);
let extractor;
let extractorPromise;
const embed = async text => {
  extractor ??= await (extractorPromise ??= loadSearchExtractor(profile, { intraOpNumThreads: 2, interOpNumThreads: 1 }));
  const output = await extractor(passagePrefix + text, { pooling, normalize: true, truncation: true });
  return Array.from(output.data, x => Math.round(x * 127));
};
const vectors = [];
const titleVectors = [];
const documents = await loadSearchDocuments(items);
let embedded = 0;
for (let i = 0; i < items.length; i++) {
  const position = previousPositions.get(items[i].id);
  for (const [field, target, oldVectors] of [['title', titleVectors, previous?.titleVectors], ['body', vectors, previous?.vectors]]) {
    if (position !== undefined && previous.documents?.[position]?.[field] === documents[i][field] && oldVectors?.[position]?.length) {
      target.push(oldVectors[position]);
    } else {
      target.push(await embed(documents[i][field]));
      embedded++;
    }
  }
  if (i % 50 === 0) console.log(`${i}/${items.length}`);
}
await mkdir('data/search', { recursive: true });
const domainAnchors = pooling === 'sentence_embedding' ? (reusable && previous.domainAnchors || {
  medical: await Promise.all(medicalTopics.map(embed)), unrelated: await Promise.all(unrelatedTopics.map(embed))
}) : undefined;
await writeFile(outputPath, JSON.stringify({ model, revision, queryPrefix, pooling, dtype, domainAnchors, version: 3, sourceHash: createHash('sha256').update(source).digest('hex'), ids: items.map(x => x.id), vectors, titleVectors, documents }));
await extractor?.dispose();
console.log(`Indexed ${items.length} sessions (${embedded} new embeddings; unchanged text reused)`);
