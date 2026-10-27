import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sessionSearchDocument } from '../scripts/search-documents.mjs';

test('indexes every scheduled title and speaker identity/location, including items without video', () => {
  const speaker = { firstName: 'Élodie', lastName: 'Martin', country: { name: 'France' }, city: { name: 'Lyon' } };
  const document = sessionSearchDocument({
    title: 'Imagerie &amp; soins', sessionType: 'Cours',
    objectives: ['<p>Objectif&nbsp;clinique</p>'], topics: [{ value: 'Radiologie' }]
  }, {
    sessionType: 'Atelier', speakers: { items: [speaker] },
    schedule: { items: [
      { title: 'Première intervention', vod: null, speakers: { items: [speaker] } },
      { title: 'Deuxième intervention', speakers: { items: [{ firstName: 'John', lastName: 'Smith', country: { name: 'Canada' }, city: { name: 'Montréal' } }] } }
    ] }
  });
  assert.equal(document.title, 'Imagerie & soins');
  assert.equal(document.body, 'Imagerie & soins. Atelier. Première intervention. Deuxième intervention. Élodie Martin France Lyon. John Smith Canada Montréal. Objectif clinique. Radiologie');
});

test('handles absent schedules, speakers and locations without adding missing-value text', () => {
  const item = { title: 'Session', sessionType: 'Cours', objectives: [], topics: [] };
  assert.equal(sessionSearchDocument(item, {}).body, 'Session. Cours');
  assert.equal(sessionSearchDocument(item, {
    speakers: { items: [{ firstName: 'Jane', lastName: 'Doe', country: null, city: null }] }
  }).body, 'Session. Cours. Jane Doe');
});
