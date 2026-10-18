import { createLexicalIndex, scoreSessions } from '../src/lib/search-scoring.mjs';
import { pipeline, env } from '@huggingface/transformers';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export async function evaluateSearch(index, cases, extractor) {
  const items = JSON.parse(await readFile('static/json/event.json', 'utf8')).data.event.search.items;
  const byId = new Map(items.map(item => [item.id, item]));
  const lexical = index.documents ? createLexicalIndex(index.documents) : undefined;
  const results = [];
  for (const entry of cases) {
    const start = performance.now();
    const out = await extractor((index.queryPrefix || '') + entry.query, { pooling: 'mean', normalize: true, truncation: true });
    const cosine = vector => vector.reduce((sum, value, i) => sum + value * out.data[i], 0) / Math.hypot(...vector);
    const ranked = lexical ? scoreSessions(index, out.data, lexical, entry.query) : index.vectors.map((vector, i) => ({ id: index.ids[i], score: cosine(vector) })).sort((a,b) => b.score-a.score);
    const regex = new RegExp(entry.relevant, 'i');
    const rank = ranked.findIndex(result => regex.test(byId.get(result.id).title)) + 1;
    results.push({ query: entry.query, rank, ms: Math.round(performance.now()-start), top: ranked.slice(0,3).map(result => ({ title: byId.get(result.id).title, score: +result.score.toFixed(3) })) });
    console.log(`${rank > 0 && rank <= 3 ? 'PASS' : 'MISS'} #${rank || 'none'}: ${entry.query} -> ${results.at(-1).top[0]?.title ?? '(no results)'}`);
  }
  const metrics = { top1: results.filter(result => result.rank === 1).length, top3: results.filter(result => result.rank > 0 && result.rank <=3).length, total: results.length, mrr: results.reduce((sum,result)=>sum+(result.rank ? 1/result.rank : 0),0)/results.length };
  return { model: index.model, metrics, results };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const index = JSON.parse(await readFile(process.argv[2] || 'static/search/index.json', 'utf8'));
  const cases = JSON.parse(await readFile(process.argv[4] || 'tests/search-queries.json', 'utf8'));
  env.cacheDir = '.cache/transformers';
  const extractor = await pipeline('feature-extraction', index.model, { revision: index.revision ?? 'main', dtype: 'q8' });
  const report = await evaluateSearch(index, cases, extractor);
  console.log(report.metrics);
  await writeFile(process.argv[3] || '.cache/search-evaluation.json', JSON.stringify(report, null, 2));
}
