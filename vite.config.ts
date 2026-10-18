import devtoolsJson from 'vite-plugin-devtools-json';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';

// The curated Transformers.js source entry is browser-only. Match the upstream
// web bundle's empty Node builtins and omit its native ONNX loader.
function embeddingBrowserModules(): Plugin {
	const emptyModule = '\0embedding-browser-empty';
	return {
		name: 'embedding-browser-modules',
		enforce: 'pre',
		resolveId(source, importer) {
			if (importer?.replaceAll('\\', '/').includes('/@huggingface/transformers/src/') &&
				(source.startsWith('node:') || source.endsWith('/onnx-node.js'))) return emptyModule;
		},
		load(id) {
			if (id === emptyModule) return 'export default {};';
		}
	};
}

export default defineConfig({
	plugins: [embeddingBrowserModules(), sveltekit(), devtoolsJson()],
	worker: { plugins: () => [embeddingBrowserModules()] }
});
