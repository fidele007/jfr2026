import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { loadSearchDocuments } from './search-documents.mjs';

const source = await readFile('static/json/event.json');
const items = JSON.parse(source).data.event.search.items.filter(item => !item.title.startsWith('Session test'));
const documents = await loadSearchDocuments(items);
await mkdir('static/search', { recursive: true });
await writeFile('static/search/keywords.json', JSON.stringify({
  catalogueHash: createHash('sha256').update(source).digest('hex'),
  sessions: Object.fromEntries(items.map((item, index) => [item.id, documents[index].body]))
}));
console.log(`Built keyword text for ${items.length} sessions`);
