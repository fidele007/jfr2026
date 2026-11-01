import { readFile } from 'node:fs/promises';

const clean = text => String(text).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/\s+/g, ' ').trim();

const descriptions = value => [value?.description, value?.summary, ...(value?.objectives ?? [])].filter(text => typeof text === 'string');

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
      ...[detail, ...schedule].flatMap(entry => [
        ...descriptions(entry),
        entry.vod?.media?.title,
        ...descriptions(entry.vod?.media)
      ]),
      ...speakerTexts,
      ...(item.objectives ?? []),
      ...(item.topics ?? []).map(topic => topic.value),
      ...(item.organizers ?? []).map(organizer => organizer.name),
      ...(item.outerRoles ?? []).flatMap(role => (role.members?.items ?? []).map(member => [member.firstName, member.lastName].filter(Boolean).join(' ')))
    ].filter(Boolean).map(clean).filter((text, index, all) => text && all.indexOf(text) === index).join('. ')
  };
}

export async function loadSearchDocuments(items) {
  return Promise.all(items.map(async item => {
    const detail = JSON.parse(await readFile(`static/json/${item.id}.json`, 'utf8')).data.event;
    return sessionSearchDocument(item, detail);
  }));
}
