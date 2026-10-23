/** Shared by browser inference and the offline relevance evaluation. */
const stopWords = new Set('a au aux avec ce ces chez comment dans de des du elle en et est fait faut il je la le les leur l lui mais ne nos notre nous on ou par pas plus pour pourquoi que quel quelle quels quelles qui sa sans se ses son sur tout tous tres tu un une vos votre vous'.split(' '));

/** @param {string} text */
export function searchTerms(text) {
  return [...new Set(text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .match(/[a-z0-9]+/g)?.filter(word => word.length > 2 && !stopWords.has(word))
    .map(word => word.length > 4 ? word.replace(/(?:es|s)$/, '') : word) ?? [])];
}

/** @param {{ title: string, body: string }[]} documents */
export function createLexicalIndex(documents) {
  const rows = documents.map(document => ({ title: new Set(searchTerms(document.title)), body: new Set(searchTerms(document.body)) }));
  const frequencies = new Map();
  for (const row of rows) for (const term of new Set([...row.title, ...row.body])) frequencies.set(term, (frequencies.get(term) ?? 0) + 1);
  return { rows, frequencies };
}

/** @param {ArrayLike<number>} vector @param {ArrayLike<number>} query */
export function cosineSimilarity(vector, query) {
  let dot = 0, norm = 0;
  for (let i = 0; i < vector.length; i++) { dot += vector[i] * query[i]; norm += vector[i] ** 2; }
  return norm ? dot / Math.sqrt(norm) : 0;
}

/**
 * EmbeddingGemma scores have a wider range than E5. Gate on raw similarity,
 * then use rare query words to separate close semantic candidates.
 * @param {{ ids: string[], vectors: number[][], titleVectors: number[][], domainAnchors?: { medical: number[][], unrelated: number[][] } }} index
 * @param {ArrayLike<number>} queryVector
 * @param {ReturnType<typeof createLexicalIndex>} lexical
 * @param {string} query
 */
export function scoreSessions(index, queryVector, lexical, query) {
  if (index.domainAnchors) {
    const medical = Math.max(...index.domainAnchors.medical.map(vector => cosineSimilarity(vector, queryVector)));
    const unrelated = Math.max(...index.domainAnchors.unrelated.map(vector => cosineSimilarity(vector, queryVector)));
    // Abstain only when an unrelated topic clearly wins. Medical short queries
    // can have low absolute cosine scores, so a high global cutoff loses recall.
    if (unrelated > medical + .05) return [];
  }
  const terms = searchTerms(query);
  const weights = terms.map(term => Math.log(1 + index.ids.length / (1 + (lexical.frequencies.get(term) ?? 0))));
  const totalWeight = weights.reduce((a,b) => a+b, 0);
  const results = index.ids.map((id, i) => {
    const semantic = .75 * cosineSimilarity(index.titleVectors[i], queryVector) + .25 * cosineSimilarity(index.vectors[i], queryVector);
    const row = lexical.rows[i];
    const coverage = totalWeight ? terms.reduce((sum, term, j) => sum + weights[j] * (row.title.has(term) ? 1 : row.body.has(term) ? .4 : 0), 0) / totalWeight : 0;
    return { id, semantic, score: semantic + .05 * coverage };
  });
  const best = Math.max(...results.map(result => result.semantic));
  return results.filter(result => result.semantic >= Math.max(.20, best - .12) && result.score >= .22)
    .sort((a,b) => b.score - a.score);
}

