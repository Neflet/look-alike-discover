# SigLIP Model Setup

The fashion similarity search uses a custom SigLIP model that's too large to include in the repository. Follow these steps to set up the model:

## Download the Model

The SigLIP model files should be placed in the `fashion_siglip_model/` directory. You can either:

1. **Download from your existing setup** (if you have the files locally)
2. **Train your own model** using the provided scripts
3. **Use a pre-trained SigLIP model** as fallback

## Required Files

Place these files in `fashion_siglip_model/`:

```
fashion_siglip_model/
├── config.json
├── fashion_adapters.pt
├── model.safetensors
├── preprocessor_config.json
├── special_tokens_map.json
├── spiece.model
├── tokenizer_config.json
└── training_metadata.json
```

## Model Training (Optional)

If you want to train your own custom SigLIP model:

1. **Prepare your data**: Place fashion images in `fashion_ai_server/data/`
2. **Run training script**: `python scripts/retrain_siglip_local_data.py`
3. **Model will be saved** to `fashion_siglip_model/`

## Fallback Model

If the custom model is not available, the server will automatically fall back to the standard SigLIP model from Hugging Face.

## File Sizes

- `model.safetensors`: ~775MB (main model weights)
- `fashion_adapters.pt`: ~50MB (fashion-specific adapters)
- Other files: <1MB each

## Troubleshooting

If you encounter issues:

1. **Check file permissions**: Ensure the model files are readable
2. **Verify file integrity**: Make sure all required files are present
3. **Check disk space**: Ensure you have at least 1GB free space
4. **Fallback mode**: The server will use standard SigLIP if custom model fails to load

## Performance Notes

- **First load**: Model loading takes 10-30 seconds
- **Memory usage**: ~2GB RAM required for model inference
- **GPU acceleration**: Automatically uses GPU if available
- **CPU fallback**: Works on CPU but slower
