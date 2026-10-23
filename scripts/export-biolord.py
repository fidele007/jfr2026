"""Export the pinned multilingual medical candidate into the ignored JS cache.

Run in an isolated environment with CPU torch, transformers, onnx and onnxruntime.
This is an experiment; it does not publish or redistribute model weights.
"""
from pathlib import Path
import numpy as np
import torch
from transformers import AutoModel, AutoTokenizer
from onnxruntime import InferenceSession
from onnxruntime.quantization import quantize_dynamic, QuantType

MODEL = 'FremyCompany/BioLORD-2023-M'
REVISION = '4ea2ea2c89ef63365f7fcd91406a0cd8ac36d2e2'
target = Path('.cache/transformers') / MODEL / REVISION
target.mkdir(parents=True, exist_ok=True)
(target / 'onnx').mkdir(exist_ok=True)
torch.set_num_threads(2)
tokenizer = AutoTokenizer.from_pretrained(MODEL, revision=REVISION)
model = AutoModel.from_pretrained(MODEL, revision=REVISION, attn_implementation='eager').eval()
tokenizer.save_pretrained(target)
model.config.save_pretrained(target)

class Encoder(torch.nn.Module):
    def __init__(self, model):
        super().__init__()
        self.model = model

    def forward(self, input_ids, attention_mask):
        return self.model(input_ids=input_ids, attention_mask=attention_mask).last_hidden_state

encoder = Encoder(model).eval()
tokens = tokenizer('kidney stones', return_tensors='pt')
path = target / 'onnx/model.onnx'
torch.onnx.export(encoder, (tokens['input_ids'], tokens['attention_mask']), str(path),
    input_names=['input_ids', 'attention_mask'], output_names=['last_hidden_state'],
    dynamic_axes={name: {0: 'batch', 1: 'sequence'} for name in ['input_ids', 'attention_mask', 'last_hidden_state']},
    opset_version=17, dynamo=False)
session = InferenceSession(str(path), providers=['CPUExecutionProvider'])
actual = session.run(None, {name: value.numpy() for name, value in tokens.items()})[0]
with torch.no_grad():
    expected = encoder(**tokens).numpy()
np.testing.assert_allclose(actual, expected, atol=1e-4, rtol=1e-4)
quantize_dynamic(str(path), str(target / 'onnx/model_quantized.onnx'),
    weight_type=QuantType.QUInt8, per_channel=False)
print('Export parity passed; quantized candidate ready:', target, flush=True)
