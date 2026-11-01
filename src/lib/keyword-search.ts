export function normalizeKeywordText(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase();
}

export function matchesKeywordText(fields: string[], query: string): boolean {
  const term = normalizeKeywordText(query.trim());
  return fields.some(field => field.includes(term));
}
