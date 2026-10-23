import { AutoModel, AutoTokenizer, pipeline, env } from '@huggingface/transformers';

env.cacheDir = process.env.SEARCH_MODEL_CACHE || '.cache/transformers';

export async function loadSearchExtractor(index, sessionOptions = {}) {
  const options = { revision: index.revision, dtype: index.dtype || 'q8', session_options: sessionOptions };
  if (index.pooling === 'sentence_embedding') {
    const [model, tokenizer] = await Promise.all([
      AutoModel.from_pretrained(index.model, options),
      AutoTokenizer.from_pretrained(index.model, options)
    ]);
    const extract = async text => {
      const output = await model(tokenizer(text, { padding: true, truncation: true }));
      return output.sentence_embedding.normalize(2, -1);
    };
    extract.dispose = () => model.dispose();
    return extract;
  }
  const extractor = await pipeline('feature-extraction', index.model, options);
  const extract = text => extractor(text, { pooling: index.pooling || 'mean', normalize: true });
  extract.dispose = () => extractor.dispose();
  return extract;
}

export function searchModelProfile(model, revision, dtype = 'q8') {
  if (model.includes('embeddinggemma-300m')) return {
    model, revision, dtype, pooling: 'sentence_embedding',
    queryPrefix: 'task: search result | query: ', passagePrefix: 'title: none | text: '
  };
  if (model.includes('Qwen3-Embedding')) return {
    model, revision, dtype, pooling: 'last_token',
    queryPrefix: 'Instruct: Given a medical conference search query, retrieve relevant radiology sessions\nQuery:',
    passagePrefix: ''
  };
  return {
    model, revision, dtype, pooling: model.endsWith('/bge-m3') ? 'cls' : 'mean',
    queryPrefix: model.includes('/multilingual-e5-') ? 'query: ' : '',
    passagePrefix: model.includes('/multilingual-e5-') ? 'passage: ' : ''
  };
}
