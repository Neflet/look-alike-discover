#!/usr/bin/env python3
"""
SigLIP Model Training Script for Fashion Items using Local Images

This script trains the SigLIP model using locally downloaded fashion images
to improve clothing identification and similarity search accuracy.
"""

import os
import json
import logging
import argparse
from typing import Dict, List, Any, Optional
from datetime import datetime
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from transformers import AutoModel, AutoProcessor, Trainer, TrainingArguments, DataCollatorWithPadding
from PIL import Image
from pathlib import Path
import random
from tqdm import tqdm

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LocalFashionDataset(Dataset):
    """Custom dataset for fashion items using local images"""
    
    def __init__(self, image_paths: List[str], processor, max_length: int = 77):
        self.image_paths = image_paths
        self.processor = processor
        self.max_length = max_length
    
    def __len__(self):
        return len(self.image_paths)
    
    def __getitem__(self, idx):
        image_path = self.image_paths[idx]
        
        # Load local image
        try:
            image = Image.open(image_path).convert('RGB')
        except Exception as e:
            logger.warning(f"Failed to load image {image_path}: {e}")
            # Create a blank image as fallback
            image = Image.new('RGB', (224, 224), color='white')
        
        # Create text description from filename and path
        brand = Path(image_path).parent.name
        filename = Path(image_path).stem
        
        # Clean up filename for better text description
        text_parts = []
        text_parts.append(brand)
        
        # Extract product info from filename
        if '_main' in filename:
            filename = filename.replace('_main', '')
        if '_secondary' in filename:
            filename = filename.replace('_secondary_1', '').replace('_secondary_2', '').replace('_secondary_3', '').replace('_secondary_4', '')
        
        # Add cleaned filename as description
        text_parts.append(filename)
        
        text = " ".join(text_parts)
        
        # Process with SigLIP processor
        inputs = self.processor(
            text=text,
            images=image,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=self.max_length
        )
        
        # Handle different processor outputs
        result = {
            'input_ids': inputs['input_ids'].squeeze(),
            'pixel_values': inputs['pixel_values'].squeeze(),
        }
        
        # Add attention_mask if available
        if 'attention_mask' in inputs:
            result['attention_mask'] = inputs['attention_mask'].squeeze()
        
        return result

class LocalSigLIPTrainer:
    """Handles training of SigLIP model using local fashion images"""
    
    def __init__(self, model_name: str = "google/siglip-base-patch16-224"):
        self.model_name = model_name
        self.processor = AutoProcessor.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name)
        
        # Setup model for fine-tuning
        self.setup_model_for_finetuning()
    
    def setup_model_for_finetuning(self):
        """Setup model for fine-tuning with fashion-specific adaptations"""
        # Freeze base vision and text encoders
        for param in self.model.vision_model.parameters():
            param.requires_grad = False
        for param in self.model.text_model.parameters():
            param.requires_grad = False
        
        # Add trainable adaptation layers
        vision_dim = self.model.vision_model.config.hidden_size
        text_dim = self.model.text_model.config.hidden_size
        
        # Fashion-specific projection layers
        self.fashion_vision_adapter = nn.Sequential(
            nn.Linear(vision_dim, vision_dim // 2),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(vision_dim // 2, vision_dim)
        )
        
        self.fashion_text_adapter = nn.Sequential(
            nn.Linear(text_dim, text_dim // 2),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(text_dim // 2, text_dim)
        )
        
        # Move adapters to same device as model
        device = next(self.model.parameters()).device
        self.fashion_vision_adapter.to(device)
        self.fashion_text_adapter.to(device)
    
    def load_images_from_directories(self, images_dir: str = "downloaded_images") -> List[str]:
        """Load all image paths from the downloaded images directory"""
        logger.info(f"Loading images from {images_dir}")
        
        image_paths = []
        images_path = Path(images_dir)
        
        # Get all image files recursively
        image_extensions = ['.jpg', '.jpeg', '.png', '.webp']
        
        for img_dir in images_path.iterdir():
            if img_dir.is_dir():
                brand_name = img_dir.name
                logger.info(f"Processing brand: {brand_name}")
                
                for img_file in img_dir.iterdir():
                    if img_file.is_file() and img_file.suffix.lower() in image_extensions:
                        image_paths.append(str(img_file))
                
                logger.info(f"Found {len([p for p in image_paths if Path(p).parent.name == brand_name])} images for {brand_name}")
        
        logger.info(f"Total images found: {len(image_paths)}")
        return image_paths
    
    def create_training_args(self, output_dir: str, num_epochs: int = 3) -> TrainingArguments:
        """Create training arguments for Hugging Face Trainer"""
        return TrainingArguments(
            output_dir=output_dir,
            num_train_epochs=num_epochs,
            per_device_train_batch_size=8,  # Reduced for memory constraints
            per_device_eval_batch_size=8,
            warmup_steps=500,
            weight_decay=0.01,
            logging_dir=f'{output_dir}/logs',
            logging_steps=50,
            save_steps=500,
            eval_steps=500,
            save_strategy="steps",
            remove_unused_columns=False,
            dataloader_pin_memory=False,
            gradient_accumulation_steps=2,  # Effective batch size = 8 * 2 = 16
        )
    
    def train_model(self, output_dir: str = "./fashion_siglip_model", num_epochs: int = 3):
        """Main training function"""
        logger.info("Starting SigLIP model training for fashion items using local images...")
        
        # Load training data
        image_paths = self.load_images_from_directories()
        if len(image_paths) < 100:
            logger.warning(f"Only {len(image_paths)} images found. Consider adding more data for better training.")
        
        # Split data (80% train, 20% eval)
        random.shuffle(image_paths)  # Shuffle for better distribution
        split_idx = int(0.8 * len(image_paths))
        train_images = image_paths[:split_idx]
        eval_images = image_paths[split_idx:]
        
        logger.info(f"Training on {len(train_images)} images, evaluating on {len(eval_images)} images")
        
        # Create datasets
        train_dataset = LocalFashionDataset(train_images, self.processor)
        eval_dataset = LocalFashionDataset(eval_images, self.processor)
        
        # Create training arguments
        training_args = self.create_training_args(output_dir, num_epochs)
        
        # Create trainer
        trainer = Trainer(
            model=self.model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=eval_dataset,
            data_collator=DataCollatorWithPadding(tokenizer=self.processor.tokenizer),
        )
        
        # Train the model
        logger.info("Starting training...")
        trainer.train()
        
        # Save the model
        logger.info(f"Saving model to {output_dir}")
        trainer.save_model(output_dir)
        self.processor.save_pretrained(output_dir)
        
        # Save training metadata
        metadata = {
            'model_name': self.model_name,
            'training_date': datetime.now().isoformat(),
            'num_train_images': len(train_images),
            'num_eval_images': len(eval_images),
            'num_epochs': num_epochs,
            'brands': list(set(Path(p).parent.name for p in image_paths)),
        }
        
        with open(f"{output_dir}/training_metadata.json", 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info("Training completed successfully!")
        return output_dir

def main():
    parser = argparse.ArgumentParser(description="Train SigLIP model on local fashion images")
    parser.add_argument("--output_dir", default="./fashion_siglip_model", help="Output directory for trained model")
    parser.add_argument("--epochs", type=int, default=3, help="Number of training epochs")
    parser.add_argument("--model_name", default="google/siglip-base-patch16-224", help="Base SigLIP model to fine-tune")
    
    args = parser.parse_args()
    
    # Create trainer
    trainer = LocalSigLIPTrainer(model_name=args.model_name)
    
    # Train model
    trainer.train_model(output_dir=args.output_dir, num_epochs=args.epochs)

if __name__ == "__main__":
    main()
