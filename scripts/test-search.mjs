import { loadSearchExtractor } from './search-extractor.mjs';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { evaluateSearch } from './evaluate-search.mjs';
import { scoreSessions, createLexicalIndex } from '../src/lib/search-scoring.mjs';

const source = readFileSync('static/json/event.json');
const items = JSON.parse(source).data.event.search.items.filter(item => !item.title.startsWith('Session test'));
const index = JSON.parse(readFileSync('data/search/index.json'));
assert.equal(index.sourceHash, createHash('sha256').update(source).digest('hex'));
assert.equal(index.version, 3);
assert.equal(index.queryPrefix, 'task: search result | query: ');
assert.equal(index.pooling, 'sentence_embedding');
assert.equal(index.dtype, 'q8');
assert.equal(index.domainAnchors.medical.length, 5);
assert.equal(index.domainAnchors.unrelated.length, 7);
assert.match(index.revision, /^[a-f0-9]{40}$/);
assert.deepEqual(index.ids, items.map(item => item.id));
assert.equal(new Set(index.ids).size, items.length);
assert.equal(index.documents.length, items.length);
for (const vectors of [index.vectors, index.titleVectors]) {
  assert.equal(vectors.length, items.length);
  assert(vectors.every(vector => vector.length === 768 && vector.some(x => x !== 0) && vector.every(value => Number.isInteger(value) && Math.abs(value) <= 127)));
}
const extractor = await loadSearchExtractor(index);
const cases = JSON.parse(readFileSync('tests/search-queries.json'));
const report = await evaluateSearch(index, cases, extractor);
assert(report.metrics.top1 >= 21, 'Primary query set: top-one relevance regressed');
assert(report.metrics.top3 >= 22, 'Primary query set: top-three relevance regressed');
for (const query of ['cancer du sein', 'accident vasculaire cérébral', 'IRM pour sclérose en plaques', 'imagerie maladie Alzheimer']) {
  assert.equal(report.results.find(result => result.query === query).rank, 1, query);
}
const holdout = await evaluateSearch(index, JSON.parse(readFileSync('tests/search-holdout.json')), extractor);
assert.equal(holdout.metrics.top3, holdout.metrics.total, 'Secondary query set: top-three relevance regressed');
const bilingual = await evaluateSearch(index, JSON.parse(readFileSync('tests/search-bilingual.json')), extractor);
assert(bilingual.metrics.top3 >= 22, 'Bilingual retrieval regressed');
for (const query of ['kidney stones', 'stroke', 'MRI multiple sclerosis']) {
  assert(bilingual.results.find(result => result.query === query).rank <= 3, query);
}
const medical = await evaluateSearch(index, JSON.parse(readFileSync('tests/search-medical-holdout.json')), extractor);
assert(medical.metrics.top3 >= 29, 'Medical terminology retrieval regressed');
const validation = await evaluateSearch(index, JSON.parse(readFileSync('tests/search-medical-validation.json')), extractor);
assert(validation.metrics.top3 >= 10, 'Medical validation retrieval regressed');
for (const query of ['renal colic', 'colique néphrétique', 'urinary calculi']) {
  assert.equal(validation.results.find(result => result.query === query).rank, 1, query);
}
const lexical = createLexicalIndex(index.documents);
for (const query of JSON.parse(readFileSync('tests/search-negative-queries.json'))) {
  const out = await extractor(index.queryPrefix + query, { pooling: 'mean', normalize: true, truncation: true });
  assert.equal(scoreSessions(index, out.data, lexical, query).length, 0, `Unrelated query should have no semantic matches: ${query}`);
}
console.log('Index integrity, relevance thresholds across 100 queries, and 12 unrelated-query rejections passed', report.metrics, holdout.metrics, bilingual.metrics, medical.metrics, validation.metrics);
