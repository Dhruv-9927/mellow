# Classifier attribution

Model: https://huggingface.co/onnx-community/face-emotion-detection-ONNX
Base model: https://huggingface.co/abhilash88/face-emotion-detection
Pinned revision: 905691b2f5f19e65b2dc909b01f0451a2e81d963
License declared by model card: Apache-2.0.
Architecture: ViT image classifier trained on FER2013; q8 ONNX variant.
Index order from model card: angry, disgust, fear, happy, sad, surprise, neutral.
Runtime: Transformers.js 4.3.1 in a worker using WASM, one in-flight crop.
The asset preparation command includes the upstream README and a source/hash manifest.

Category scores are not calibrated probabilities of inner emotional states.
Valence/arousal are an explicit aesthetic mapping from scores.
Model-card benchmarks have not been independently verified.
