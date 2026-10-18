// The package ships these source modules with equivalent public declarations,
// but does not link the source files to the declarations in its exports map.
declare module '*@huggingface/transformers/src/models/bert/modeling_bert.js' {
  export { BertModel } from '@huggingface/transformers';
}
declare module '*@huggingface/transformers/src/models/bert/tokenization_bert.js' {
  export { BertTokenizer } from '@huggingface/transformers';
}
declare module '*@huggingface/transformers/src/env.js' {
  export { env } from '@huggingface/transformers';
}
declare module '*@huggingface/transformers/src/utils/tensor.js' {
  export { mean_pooling } from '@huggingface/transformers';
}
declare module '*@huggingface/transformers/src/models/modeling_utils.js' {
  export const MODEL_CLASS_TO_NAME_MAPPING: Map<Function, string>;
  export const MODEL_TYPE_MAPPING: Map<string, number>;
  export const MODEL_TYPES: { EncoderOnly: number };
}
