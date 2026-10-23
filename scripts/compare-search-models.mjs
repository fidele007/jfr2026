// Compare embedding rankings before model-specific filtering or lexical bonuses.
import { readFile, writeFile } from 'node:fs/promises';
import { cosineSimilarity } from '../src/lib/search-scoring.mjs';
import { loadSearchExtractor } from './search-extractor.mjs';
import assert from 'node:assert/strict';

const suites = await Promise.all(['search-queries', 'search-holdout', 'search-bilingual', 'search-medical-holdout'].map(async name => ({
  name, cases: JSON.parse(await readFile(`tests/${name}.json`, 'utf8'))
})));
const reports = [];
let reference;
for (const path of process.argv.slice(2)) {
  const index = JSON.parse(await readFile(path, 'utf8'));
  reference ??= index;
  assert.equal(index.sourceHash, reference.sourceHash, 'Models must index the same catalogue');
  assert.deepEqual(index.ids, reference.ids, 'Models must rank the same sessions');
  const extractor = await loadSearchExtractor(index);
  const report = { model: index.model, revision: index.revision, dtype: index.dtype || 'q8', pooling: index.pooling || 'mean', suites: [] };
  for (const suite of suites) {
    const results = [];
    for (const entry of suite.cases) {
      const start = performance.now();
      const out = await extractor(index.queryPrefix + entry.query, { pooling: index.pooling || 'mean', normalize: true });
      const ranked = index.ids.map((id, i) => ({
        id, title: index.documents[i].title,
        score: .75 * cosineSimilarity(index.titleVectors[i], out.data) + .25 * cosineSimilarity(index.vectors[i], out.data)
      })).sort((a, b) => b.score - a.score);
      const rank = ranked.findIndex(row => new RegExp(entry.relevant, 'i').test(row.title)) + 1;
      results.push({ query: entry.query, rank, ms: Math.round(performance.now() - start), top: ranked.slice(0, 3) });
    }
    const metrics = {
      top1: results.filter(row => row.rank === 1).length,
      top3: results.filter(row => row.rank > 0 && row.rank <= 3).length,
      total: results.length
    };
    report.suites.push({ name: suite.name, metrics, results });
    console.log(index.model, suite.name, metrics);
  }
  reports.push(report);
  await extractor.dispose();
}
await writeFile('.cache/search-model-benchmark.json', JSON.stringify(reports, null, 2));
