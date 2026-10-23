import { readdir, readFile, stat } from 'node:fs/promises';
import assert from 'node:assert/strict';
async function files(path) {
  const entries = await readdir(path, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(`${path}/${entry.name}`) : `${path}/${entry.name}`))).flat();
}
const paths = await files('build');
assert(!paths.some(path => /\.(?:wasm|onnx)$/.test(path) || /semantic\.worker|search\/index\.json/.test(path)), 'Model/runtime/index must not be published with the website');
let javascriptBytes = 0;
for (const path of paths.filter(path => path.endsWith('.js'))) {
  const text = await readFile(path, 'utf8');
  assert(!/embeddinggemma|onnxruntime|huggingface\.co/.test(text), `Inference dependency in client: ${path}`);
  javascriptBytes += (await stat(path)).size;
}
console.log(`Client has no model, WASM runtime or search index; ${javascriptBytes} bytes of JavaScript total`);
