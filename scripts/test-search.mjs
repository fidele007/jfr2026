import { pipeline, env } from '@huggingface/transformers';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const source = readFileSync('static/json/event.json');
const items = JSON.parse(source).data.event.search.items.filter(x => !x.title.startsWith('Session test'));
const index = JSON.parse(readFileSync('static/search/index.json'));
assert.equal(index.sourceHash, createHash('sha256').update(source).digest('hex'));
assert.equal(index.ids.length, items.length);
assert.equal(new Set(index.ids).size, items.length);
assert(index.vectors.every(v => v.length === 384 && v.every(Number.isFinite)));
env.cacheDir = '.cache/transformers';
const extractor = await pipeline('feature-extraction', index.model, { dtype: 'q8' });
for (const [query, expected] of [['accident vasculaire cérébral', /neurolog|AVC|vasculaire|cérébr/i], ['cancer du sein', /sein|mammaire/i]]) {
 const out = await extractor(query, { pooling: 'mean', normalize: true });
 const ranked = index.vectors.map((v, i) => ({ title: items[i].title, score: v.reduce((sum, x, j) => sum + x * out.data[j], 0) / Math.hypot(...v) })).sort((a,b) => b.score-a.score);
 console.log(query, ranked.slice(0,3));
 assert(ranked.slice(0,3).some(x => expected.test(x.title) && x.score >= .35));
}
console.log('Index integrity and French semantic retrieval passed');

