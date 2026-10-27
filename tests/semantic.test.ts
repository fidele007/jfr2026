import { test, expect } from 'bun:test';
import { rankSessions } from '../src/lib/semantic';

test('keeps exact matches above semantic matches and excludes unrelated sessions', () => {
 const sessions = [{ id: 'related' }, { id: 'unrelated' }, { id: 'speaker' }];
 const result = rankSessions(sessions, new Map([['related', .8], ['unrelated', .1], ['speaker', .05]]), x => x.id === 'speaker');
 expect(result.map(x => x.id)).toEqual(['speaker', 'related']);
});

test('caps semantic matches while keeping all keyword matches', () => {
 const sessions = Array.from({length: 70}, (_, i) => ({id: String(i)}));
 const scores = new Map(sessions.map(x => [x.id, .7]));
 expect(rankSessions(sessions, scores, () => false)).toHaveLength(50);
 expect(rankSessions(sessions, scores, () => true)).toHaveLength(70);
});

import { searchTerms, createLexicalIndex, scoreSessions } from '../src/lib/search-scoring.mjs';

test('normalizes accented words and ignores French function words', () => {
 expect(searchTerms('les LÉSIONS des reins')).toEqual(['lesion', 'rein']);
});

test('uses specific title terms to separate equally similar sessions', () => {
 const documents = [
   { title: 'Imagerie neurologique', body: 'maladie Alzheimer' },
   { title: 'Imagerie Alzheimer', body: 'neurologie' }
 ];
 const index = { ids: ['broad', 'specific'], vectors: [[1, 0], [1, 0]], titleVectors: [[1, 0], [1, 0]] };
 expect(scoreSessions(index, [1, 0], createLexicalIndex(documents), 'Alzheimer').map(x => x.id)).toEqual(['specific', 'broad']);
});

test('rejects low semantic similarity with only partial keyword overlap', () => {
 const index = { ids: ['unrelated'], vectors: [[0, 1]], titleVectors: [[0, 1]] };
 expect(scoreSessions(index, [1, 0], createLexicalIndex([{title: 'Alzheimer', body: ''}]), 'Alzheimer traitement')).toEqual([]);
});

test('promotes complete video-title matches over broad semantic candidates', () => {
 const index = { ids: ['broad', 'specific'], vectors: [[1, 0], [0, -1]], titleVectors: [[1, 0], [0, -1]] };
 const lexical = createLexicalIndex([
   { title: 'Oncologie', body: '' },
   { title: 'Imager pour mieux soigner', body: 'LITT en oncologie pédiatrique' }
 ]);
 const results = scoreSessions(index, [.4, Math.sqrt(.84)], lexical, 'LITT en oncologie');
 expect(results[0].id).toBe('specific');
 // A complete keyword match also survives when its embedding is unrelated.
 expect(scoreSessions(index, [1, 0], lexical, 'LITT en oncologie').some(row => row.id === 'specific' && row.score >= .55)).toBe(true);
});

test('keeps speaker and location matches even when domain anchors reject the query', () => {
 const index = { ids: ['speaker'], vectors: [[0, 1]], titleVectors: [[0, 1]], domainAnchors: { medical: [[0, 1]], unrelated: [[1, 0]] } };
 const lexical = createLexicalIndex([{ title: 'IRM', body: 'Florian Nabet France Paris' }]);
 expect(scoreSessions(index, [1, 0], lexical, 'Florian Nabet France Paris').map(row => row.id)).toEqual(['speaker']);
 expect(scoreSessions(index, [1, 0], lexical, 'recette de cuisine')).toEqual([]);
});

test('requires a phrase instead of scattered keywords for the ranking boost', () => {
 const index = { ids: ['scattered'], vectors: [[0, 1]], titleVectors: [[0, 1]] };
 const lexical = createLexicalIndex([{ title: 'IRM', body: 'LITT pédiatrique. Autres sujets en oncologie.' }]);
 expect(scoreSessions(index, [1, 0], lexical, 'LITT en oncologie')).toEqual([]);
});
