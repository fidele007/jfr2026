export async function fetchSearchScores(endpoint: string, query: string, catalogueHash: string, signal: AbortSignal): Promise<[string, number][]> {
  const response = await fetch(endpoint, {
    method: 'POST', signal, headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, catalogueHash })
  });
  if (!response.ok) throw new Error('Search unavailable');
  const data = await response.json();
  if (data.catalogueHash !== catalogueHash || !Array.isArray(data.scores) || data.scores.length > 1000 ||
    !data.scores.every((row: unknown) => Array.isArray(row) && row.length === 2 &&
      typeof row[0] === 'string' && row[0].length <= 128 && typeof row[1] === 'number' &&
      Number.isFinite(row[1]) && row[1] >= 0 && row[1] <= 1.1)) throw new Error('Invalid search response');
  return data.scores;
}
