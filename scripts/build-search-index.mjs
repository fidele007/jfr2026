import { pipeline, env } from '@huggingface/transformers';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

env.cacheDir = '.cache/transformers';
const model = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
const source = await readFile('static/json/event.json');
const items = JSON.parse(source).data.event.search.items.filter(x => !x.title.startsWith('Session test'));
const extractor = await pipeline('feature-extraction', model, { dtype: 'q8' });
const vectors = [];
for (const [i, item] of items.entries()) {
  const text = [item.title, item.title, item.title, ...item.objectives, ...item.topics.map(t => t.value)].join('. ').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
  const output = await extractor(text, { pooling: 'mean', normalize: true, truncation: true });
  vectors.push(Array.from(output.data, x => Math.round(x * 127)));
  if (i % 50 === 0) console.log(`${i}/${items.length}`);
}
await mkdir('static/search', { recursive: true });
await writeFile('static/search/index.json', JSON.stringify({ model, sourceHash: createHash('sha256').update(source).digest('hex'), ids: items.map(x => x.id), vectors }));
console.log(`Indexed ${items.length} sessions`);
