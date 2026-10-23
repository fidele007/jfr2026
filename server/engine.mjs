import { createLexicalIndex, scoreSessions } from '../src/lib/search-scoring.mjs';

export class SearchBusyError extends Error {}

export class SearchEngine {
  constructor(index, extractor, { maxPending = 8, cacheSize = 256 } = {}) {
    this.index = index;
    this.extractor = extractor;
    this.lexical = createLexicalIndex(index.documents);
    this.maxPending = maxPending;
    this.cacheSize = cacheSize;
    this.cache = new Map();
    this.pending = new Map();
    this.tail = Promise.resolve();
  }

  async search(query) {
    query = query.trim().normalize('NFC').replace(/\s+/g, ' ');
    if (this.cache.has(query)) {
      const scores = this.cache.get(query);
      this.cache.delete(query);
      this.cache.set(query, scores);
      return scores;
    }
    if (this.pending.has(query)) return this.pending.get(query);
    if (this.pending.size >= this.maxPending) throw new SearchBusyError();
    const task = this.tail.then(async () => {
      try {
        const output = await this.extractor(this.index.queryPrefix + query);
        const scores = scoreSessions(this.index, output.data, this.lexical, query)
          .map(result => [result.id, result.score]);
        this.cache.set(query, scores);
        if (this.cache.size > this.cacheSize) this.cache.delete(this.cache.keys().next().value);
        return scores;
      } finally {
        this.pending.delete(query);
      }
    });
    this.pending.set(query, task);
    this.tail = task.then(() => {}, () => {});
    return task;
  }
}
