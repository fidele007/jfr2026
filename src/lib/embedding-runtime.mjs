// Transformers.js 4.3.1's public barrel initializes every model registry, even
// when only BertModel is imported. Use its source modules to keep the browser
// worker limited to the encoder it needs. Recheck these paths on upgrades.
import { BertModel } from '../../node_modules/@huggingface/transformers/src/models/bert/modeling_bert.js';
import { BertTokenizer } from '../../node_modules/@huggingface/transformers/src/models/bert/tokenization_bert.js';
import { env } from '../../node_modules/@huggingface/transformers/src/env.js';
import { mean_pooling } from '../../node_modules/@huggingface/transformers/src/utils/tensor.js';
import { MODEL_CLASS_TO_NAME_MAPPING, MODEL_TYPE_MAPPING, MODEL_TYPES } from '../../node_modules/@huggingface/transformers/src/models/modeling_utils.js';

MODEL_CLASS_TO_NAME_MAPPING.set(BertModel, 'BertModel');
MODEL_TYPE_MAPPING.set('BertModel', MODEL_TYPES.EncoderOnly);

/**
 * @param {string} modelId
 * @param {string} revision
 * @param {'wasm' | 'cpu'} [device]
 */
export async function createEmbeddingExtractor(modelId, revision, device = 'wasm') {
  const options = { revision, dtype: /** @type {const} */ ('q8'), device };
  const [tokenizer, model] = await Promise.all([
    BertTokenizer.from_pretrained(modelId, options),
    BertModel.from_pretrained(modelId, options)
  ]);
  return async (/** @type {string} */ text) => {
    const inputs = await tokenizer(text, { padding: true, truncation: true });
    const output = await model(inputs);
    return mean_pooling(output.last_hidden_state, inputs.attention_mask).normalize(2, -1);
  };
}

export { env };
