import { readFile } from 'node:fs/promises';

const clean = text => text.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

export function sessionSearchDocument(item, detail) {
  const schedule = detail.schedule?.items ?? [];
  const speakers = [...(detail.speakers?.items ?? []), ...schedule.flatMap(entry => entry.speakers?.items ?? [])];
  const speakerTexts = [...new Set(speakers.map(speaker =>
    [speaker.firstName, speaker.lastName, speaker.country?.name, speaker.city?.name].filter(Boolean).join(' ')
  ))];
  return {
    title: clean(item.title),
    body: [
      item.title,
      detail.sessionType ?? item.sessionType,
      ...schedule.map(entry => entry.title),
      ...speakerTexts,
      ...item.objectives,
      ...item.topics.map(topic => topic.value)
    ].filter(Boolean).map(clean).filter(Boolean).join('. ')
  };
}

export async function loadSearchDocuments(items) {
  return Promise.all(items.map(async item => {
    const detail = JSON.parse(await readFile(`static/json/${item.id}.json`, 'utf8')).data.event;
    return sessionSearchDocument(item, detail);
  }));
}
