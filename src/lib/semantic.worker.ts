import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;
if (env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads = 1;
let resources: Promise<any> | undefined;
let previousQuery = '';
let previousVector: number[];
self.onmessage = async ({ data: { id, query, indexUrl } }) => {
  try {
    resources ??= (async () => {
      const response = await fetch(indexUrl);
      if (!response.ok) throw new Error('Search index unavailable');
      const index = await response.json();
      const extractor = await pipeline('feature-extraction', index.model, { dtype: 'q8', device: 'wasm' });
      return { index, extractor };
    })();
    const { index, extractor } = await resources;
    if (previousQuery !== query) {
      const output = await extractor(query, { pooling: 'mean', normalize: true, truncation: true });
      previousVector = Array.from(output.data) as number[];
      previousQuery = query;
    }
    const scores = index.vectors.map((vector: number[], i: number) => {
      let dot = 0, norm = 0;
      for (let j = 0; j < vector.length; j++) {
        dot += vector[j] * previousVector[j];
        norm += vector[j] * vector[j];
      }
      return [index.ids[i], norm ? dot / Math.sqrt(norm) : 0];
    });
    self.postMessage({ id, scores });
  } catch {
    resources = undefined;
    self.postMessage({ id, error: true });
  }
};

