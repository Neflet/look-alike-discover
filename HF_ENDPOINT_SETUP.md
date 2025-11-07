# HuggingFace Endpoint Setup Files

These files are for setting up a custom HuggingFace Inference Endpoint.

## Files:

- `handler.py` - Custom handler for google/siglip-so400m-patch14-384 model
- `hf-requirements.txt` - Python dependencies for the HF endpoint

## Setup Instructions:

1. Create a new HuggingFace Inference Endpoint
2. Select "Custom handler" option
3. Point to a repository containing these files, OR paste them into the endpoint's container config
4. Set hardware to GPU T4 (SIGLIP is heavy on CPU)
5. Deploy and watch logs - it should download weights, then show "Running"

## Environment Variables:

Set in your HuggingFace endpoint configuration:
- `MODEL_ID=google/siglip-so400m-patch14-384` (or leave as default)

## Notes:

- The handler accepts either image URLs or base64-encoded images
- Returns embeddings as a JSON object: `{"embedding": [float, ...]}`
- Embeddings are L2-normalized vectors of length 1152

