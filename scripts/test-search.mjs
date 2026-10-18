import { pipeline, env } from '@huggingface/transformers';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { evaluateSearch } from './evaluate-search.mjs';
import { scoreSessions, createLexicalIndex } from '../src/lib/search-scoring.mjs';

const source = readFileSync('static/json/event.json');
const items = JSON.parse(source).data.event.search.items.filter(item => !item.title.startsWith('Session test'));
const index = JSON.parse(readFileSync('static/search/index.json'));
assert.equal(index.sourceHash, createHash('sha256').update(source).digest('hex'));
assert.equal(index.version, 2);
assert.equal(index.queryPrefix, 'query: ');
assert.match(index.revision, /^[a-f0-9]{40}$/);
assert.deepEqual(index.ids, items.map(item => item.id));
assert.equal(new Set(index.ids).size, items.length);
assert.equal(index.documents.length, items.length);
for (const vectors of [index.vectors, index.titleVectors]) {
  assert.equal(vectors.length, items.length);
  assert(vectors.every(vector => vector.length === 384 && vector.some(x => x !== 0) && vector.every(value => Number.isInteger(value) && Math.abs(value) <= 127)));
}
env.cacheDir = '.cache/transformers';
const extractor = await pipeline('feature-extraction', index.model, { revision: index.revision, dtype: 'q8' });
const cases = JSON.parse(readFileSync('tests/search-queries.json'));
const report = await evaluateSearch(index, cases, extractor);
assert(report.metrics.top1 >= 19, 'Primary query set: top-one relevance regressed');
assert(report.metrics.top3 >= 21, 'Primary query set: top-three relevance regressed');
for (const query of ['cancer du sein', 'accident vasculaire cérébral', 'IRM pour sclérose en plaques', 'imagerie maladie Alzheimer']) {
  assert.equal(report.results.find(result => result.query === query).rank, 1, query);
}
const holdout = await evaluateSearch(index, JSON.parse(readFileSync('tests/search-holdout.json')), extractor);
assert.equal(holdout.metrics.top3, holdout.metrics.total, 'Secondary query set: top-three relevance regressed');
const lexical = createLexicalIndex(index.documents);
for (const query of ['recette gâteau chocolat', 'réparation vélo', 'zzzxxyyqqq']) {
  const out = await extractor(index.queryPrefix + query, { pooling: 'mean', normalize: true, truncation: true });
  assert.equal(scoreSessions(index, out.data, lexical, query).length, 0, `Unrelated query should have no semantic matches: ${query}`);
}
console.log('Index integrity, 36 relevance queries and 3 unrelated queries passed', report.metrics, holdout.metrics);
