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

test('rejects low semantic similarity even with overlapping vocabulary', () => {
 const index = { ids: ['unrelated'], vectors: [[0, 1]], titleVectors: [[0, 1]] };
 expect(scoreSessions(index, [1, 0], createLexicalIndex([{title: 'Alzheimer', body: ''}]), 'Alzheimer')).toEqual([]);
});
