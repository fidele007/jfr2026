import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { pipeline, env as pipelineEnv } from '@huggingface/transformers';
import { createEmbeddingExtractor, env } from '../src/lib/embedding-runtime.mjs';
const index = JSON.parse(readFileSync('static/search/index.json'));
env.cacheDir = pipelineEnv.cacheDir = '.cache/transformers';
const extractor = await createEmbeddingExtractor(index.model, index.revision, 'cpu');
const reference = await pipeline('feature-extraction', index.model, { revision: index.revision, dtype: 'q8' });
for (const query of ['cancer du sein', 'accident vasculaire cérébral', 'calculs dans les reins', 'réparation vélo']) {
  const input = index.queryPrefix + query;
  const actual = await extractor(input);
  const expected = await reference(input, { pooling: 'mean', normalize: true, truncation: true });
  assert.equal(actual.data.length, expected.data.length);
  const maxDifference = Math.max(...Array.from(actual.data, (value, i) => Math.abs(value - expected.data[i])));
  assert(maxDifference < 1e-6, `${query}: encoder differs from the reference pipeline`);
}
const workerDir = 'build/_app/immutable/workers';
const workers = readdirSync(workerDir).filter(name => /^semantic\.worker-.*\.js$/.test(name));
assert.equal(workers.length, 1, 'Build the production site before running this check');
const worker = readFileSync(`${workerDir}/${workers[0]}`, 'utf8');
assert(!worker.includes('Mistral3ForConditionalGeneration'), 'Unused Mistral registry leaked into the worker');
assert(!/\["mistral3",/.test(worker), 'Unused Mistral model mapping leaked into the worker');
console.log('Curated encoder matches the reference pipeline; production worker excludes unused model registry');
