import { createEmbeddingExtractor, env } from './embedding-runtime.mjs';
import { createLexicalIndex, scoreSessions } from './search-scoring.mjs';

env.allowLocalModels = false;
if (env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads = 1;

type Request = { id: number; query: string; indexUrl: string };
let resources: Promise<any> | undefined;
let pending: Request | undefined;
let running = false;
const cache = new Map<string, number[]>();

// Keep only the latest queued query while a download or inference is in progress.
self.onmessage = ({ data }: MessageEvent<Request>) => {
  pending = data;
  void processQueries();
};

async function processQueries() {
  if (running) return;
  running = true;
  try {
    while (pending) {
      const request = pending;
      pending = undefined;
      try {
        resources ??= (async () => {
          const response = await fetch(request.indexUrl);
          if (!response.ok) throw new Error('Search index unavailable');
          const index = await response.json();
          if (index.version !== 2) throw new Error('Search index version mismatch');
          const extractor = await createEmbeddingExtractor(index.model, index.revision);
          return { index, extractor, lexical: createLexicalIndex(index.documents) };
        })();
        const { index, extractor, lexical } = await resources;
        if (pending) continue;
        let vector = cache.get(request.query);
        if (!vector) {
          const output = await extractor(index.queryPrefix + request.query);
          vector = Array.from(output.data) as number[];
          cache.set(request.query, vector);
          if (cache.size > 20) cache.delete(cache.keys().next().value!);
        }
        if (pending) continue;
        const scores = scoreSessions(index, vector, lexical, request.query).map(result => [result.id, result.score]);
        self.postMessage({ id: request.id, scores });
      } catch {
        resources = undefined;
        if (!pending) self.postMessage({ id: request.id, error: true });
      }
    }
  } finally {
    running = false;
  }
}
