export function rankSessions<T extends { id: string }>(sessions: T[], scores: Map<string, number>, matches: (session: T) => boolean): T[] {
  return sessions.map(session => ({ session, lexical: matches(session), score: scores.get(session.id) ?? 0 }))
    .filter(result => result.lexical || result.score >= 0.22)
    .sort((a, b) => Number(b.lexical) - Number(a.lexical) || b.score - a.score)
    .filter((result, i) => result.lexical || i < 50)
    .map(result => result.session);
}
