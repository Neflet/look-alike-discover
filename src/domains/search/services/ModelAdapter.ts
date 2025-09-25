import { ModelConfig } from '../types';

export class ModelAdapter {
  private currentModel: ModelConfig;
  private baseUrl: string;

  constructor() {
    // Default to SigLIP ViT-So400m/14 (384)
    this.currentModel = {
      modelId: 'siglip-vit-so400m-14-384',
      name: 'SigLIP ViT-So400m/14 (384)',
      dimensions: 1152,
      maxImageSize: 384,
      batchSize: 32
    };
    
    this.baseUrl = 'http://localhost:8000';
  }

  async generateEmbedding(imageFile: File): Promise<number[]> {
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('model_id', this.currentModel.modelId);

    const response = await fetch(`${this.baseUrl}/embed`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Embedding generation failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.embedding;
  }

  async generateBatchEmbeddings(imageFiles: File[]): Promise<number[][]> {
    const formData = new FormData();
    imageFiles.forEach((file, index) => {
      formData.append(`files`, file);
    });
    formData.append('model_id', this.currentModel.modelId);

    const response = await fetch(`${this.baseUrl}/embed/batch`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Batch embedding generation failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.embeddings;
  }

  setModel(modelConfig: ModelConfig): void {
    this.currentModel = modelConfig;
  }

  getCurrentModel(): ModelConfig {
    return { ...this.currentModel };
  }

  getAvailableModels(): ModelConfig[] {
    return [
      {
        modelId: 'siglip-vit-so400m-14-384',
        name: 'SigLIP ViT-So400m/14 (384)',
        dimensions: 1152,
        maxImageSize: 384,
        batchSize: 32
      },
      {
        modelId: 'eva02-clip-vit-g-14',
        name: 'EVA02-CLIP ViT-G/14',
        dimensions: 1024,
        maxImageSize: 224,
        batchSize: 16
      },
      {
        modelId: 'clip-vit-b-32',
        name: 'CLIP ViT-B/32 (Legacy)',
        dimensions: 512,
        maxImageSize: 224,
        batchSize: 64
      }
    ];
  }
}