import { pipeline, env } from '@huggingface/transformers';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

env.cacheDir = '.cache/transformers';
const model = 'Xenova/multilingual-e5-small';
const revision = '761b726dd34fb83930e26aab4e9ac3899aa1fa78';
const source = await readFile('static/json/event.json');
const items = JSON.parse(source).data.event.search.items.filter(x => !x.title.startsWith('Session test'));
const extractor = await pipeline('feature-extraction', model, { revision, dtype: 'q8' });
const vectors = [];
const titleVectors = [];
const documents = [];
for (const [i, item] of items.entries()) {
  const clean = text => text.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  const title = clean(item.title);
  const text = clean([item.title, ...item.objectives, ...item.topics.map(t => t.value)].join('. '));
  documents.push({ title, body: text });
  for (const [input, target] of [[title, titleVectors], [text, vectors]]) {
    const output = await extractor('passage: ' + input, { pooling: 'mean', normalize: true, truncation: true });
    target.push(Array.from(output.data, x => Math.round(x * 127)));
  }
  if (i % 50 === 0) console.log(`${i}/${items.length}`);
}
await mkdir('static/search', { recursive: true });
await writeFile('static/search/index.json', JSON.stringify({ model, revision, queryPrefix: 'query: ', version: 2, sourceHash: createHash('sha256').update(source).digest('hex'), ids: items.map(x => x.id), vectors, titleVectors, documents }));
console.log(`Indexed ${items.length} sessions`);
