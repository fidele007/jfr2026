import { test, expect } from 'bun:test';
import { matchesKeywordText, normalizeKeywordText } from '../src/lib/keyword-search';
import { sessionSearchDocument } from '../scripts/search-documents.mjs';

test('keyword matches include talk titles, descriptions and speakers without semantic scores', () => {
  const document = sessionSearchDocument({ title: 'Atelier', objectives: [], topics: [] }, {
    schedule: { items: [{
      title: 'Échographie du tendon', description: '<p>Rupture&nbsp;partielle</p>',
      speakers: { items: [{ firstName: 'Élodie', lastName: 'Martin' }] },
      vod: { media: { title: 'Démonstration pratique', description: 'Repérage du nerf' } }
    }] }
  });
  const fields = [normalizeKeywordText(document.body)];
  for (const query of ['echographie du tendon', 'rupture partielle', 'elodie martin', 'demonstration pratique', 'reperage du nerf']) {
    expect(matchesKeywordText(fields, query)).toBe(true);
  }
  expect(matchesKeywordText(fields, 'pancréas')).toBe(false);
});

test('preserves substring matching without matching a phrase across unrelated fields', () => {
  const fields = ['IMAGERIE DU SEIN', 'JEAN MARTIN'];
  expect(matchesKeywordText(fields, ' sein ')).toBe(true);
  expect(matchesKeywordText(fields, 'sein jean')).toBe(false);
});
