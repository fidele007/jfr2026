import { readFile } from 'node:fs/promises';
import { loadSearchExtractor } from '../scripts/search-extractor.mjs';
import { SearchEngine } from './engine.mjs';
import { createSearchServer } from './http.mjs';

const allowedOrigins = (process.env.SEARCH_ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);
if (!allowedOrigins.length || allowedOrigins.includes('*')) throw new Error('Set SEARCH_ALLOWED_ORIGINS to exact website origins');
const index = JSON.parse(await readFile(new URL('../data/search/index.json', import.meta.url), 'utf8'));
if (index.version !== 3 || index.pooling !== 'sentence_embedding' || !index.domainAnchors || index.ids.length > 1000) throw new Error('Rebuild the search index (up to 1000 sessions supported)');
let engine;
let stopping = false;
const server = createSearchServer({ getEngine: () => engine, allowedOrigins, trustProxy: process.env.SEARCH_TRUST_PROXY === '1' });
const port = Number(process.env.PORT || 3000);
server.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`Search service listening on port ${port}; loading model`));
const threads = Number(process.env.SEARCH_CPU_THREADS || 2);
if (!Number.isInteger(threads) || threads < 1 || threads > 8) throw new Error('SEARCH_CPU_THREADS must be between 1 and 8');
try {
  const extractor = await loadSearchExtractor(index, { intraOpNumThreads: threads, interOpNumThreads: 1 });
  // Warm the native runtime before declaring readiness.
  await extractor(index.queryPrefix + 'imagerie médicale');
  engine = new SearchEngine(index, extractor);
  console.log(`Search ready: ${index.ids.length} sessions; catalogue ${index.sourceHash}`);
} catch (error) {
  console.error('Search startup failed:', error.message);
  process.exit(1);
}
async function stop() {
  if (stopping) return;
  stopping = true;
  const active = engine; engine = undefined;
  const deadline = setTimeout(() => process.exit(1), 10000); deadline.unref();
  server.closeIdleConnections();
  await new Promise(resolve => server.close(resolve));
  await active?.tail;
  await active?.extractor.dispose();
  clearTimeout(deadline);
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
