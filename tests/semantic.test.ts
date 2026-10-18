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

