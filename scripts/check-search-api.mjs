import { readFile } from 'node:fs/promises';
import { loadEnv } from 'vite';
import searchConfig from '../src/lib/search-config.json' with { type: 'json' };

const environment = { ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env };
const endpoint = (environment.VITE_SEARCH_API_URL ?? searchConfig.endpoint).trim();
if (endpoint) {
  const keywordIndex = JSON.parse(await readFile('build/search/keywords.json', 'utf8'));
  const response = await fetch(new URL('/healthz', endpoint), { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Search API is not ready (${response.status}). Website was not published.`);
  const health = await response.json();
  if (!health.ready || health.catalogueHash !== keywordIndex.catalogueHash) {
    throw new Error('Search API has an outdated index. Update the ASUS checkout and rebuild its search container before deploying the website.');
  }
  console.log('Search API is ready and matches the website catalogue');
}
