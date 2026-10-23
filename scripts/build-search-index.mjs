import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { loadSearchExtractor, searchModelProfile } from './search-extractor.mjs';
import { medicalTopics, unrelatedTopics } from '../src/lib/search-domain.mjs';

const model = process.argv[2] || 'onnx-community/embeddinggemma-300m-ONNX';
const revision = process.argv[3] || '5090578d9565bb06545b4552f76e6bc2c93e4a66';
const profile = searchModelProfile(model, revision, process.argv[6] || 'q8');
if (process.argv[5]) profile.pooling = process.argv[5];
const { pooling, queryPrefix, passagePrefix, dtype } = profile;
const source = await readFile('static/json/event.json');
const items = JSON.parse(source).data.event.search.items.filter(x => !x.title.startsWith('Session test'));
const extractor = await loadSearchExtractor(profile);
const vectors = [];
const titleVectors = [];
const documents = [];
for (const [i, item] of items.entries()) {
  const clean = text => text.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  const title = clean(item.title);
  const text = clean([item.title, ...item.objectives, ...item.topics.map(t => t.value)].join('. '));
  documents.push({ title, body: text });
  for (const [input, target] of [[title, titleVectors], [text, vectors]]) {
    const output = await extractor(passagePrefix + input, { pooling, normalize: true, truncation: true });
    target.push(Array.from(output.data, x => Math.round(x * 127)));
  }
  if (i % 50 === 0) console.log(`${i}/${items.length}`);
}
await mkdir('data/search', { recursive: true });
const embedTopics = async topics => Promise.all(topics.map(async text =>
  Array.from((await extractor(passagePrefix + text)).data, x => Math.round(x * 127))));
const domainAnchors = pooling === 'sentence_embedding' ? {
  medical: await embedTopics(medicalTopics), unrelated: await embedTopics(unrelatedTopics)
} : undefined;
await writeFile(process.argv[4] || 'data/search/index.json', JSON.stringify({ model, revision, queryPrefix, pooling, dtype, domainAnchors, version: 3, sourceHash: createHash('sha256').update(source).digest('hex'), ids: items.map(x => x.id), vectors, titleVectors, documents }));
console.log(`Indexed ${items.length} sessions`);
