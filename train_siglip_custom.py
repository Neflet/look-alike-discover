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
from transformers import AutoModel, AutoProcessor, TrainingArguments
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

class SigLIPTrainer:
    """Custom trainer for SigLIP model with contrastive loss"""
    
    def __init__(self, model, processor, device='cpu'):
        self.model = model
        self.processor = processor
        self.device = device
        self.model.to(device)
        
    def compute_contrastive_loss(self, image_embeds, text_embeds, temperature=0.07):
        """Compute contrastive loss for image-text pairs"""
        # Normalize embeddings
        image_embeds = image_embeds / image_embeds.norm(p=2, dim=-1, keepdim=True)
        text_embeds = text_embeds / text_embeds.norm(p=2, dim=-1, keepdim=True)
        
        # Compute similarity matrix
        logits = torch.matmul(image_embeds, text_embeds.t()) / temperature
        
        # Labels are diagonal (each image matches its corresponding text)
        batch_size = image_embeds.shape[0]
        labels = torch.arange(batch_size, device=image_embeds.device)
        
        # Symmetric loss
        loss_img = nn.CrossEntropyLoss()(logits, labels)
        loss_txt = nn.CrossEntropyLoss()(logits.t(), labels)
        
        return (loss_img + loss_txt) / 2
    
    def train_epoch(self, dataloader, optimizer, epoch):
        """Train for one epoch"""
        self.model.train()
        total_loss = 0
        
        progress_bar = tqdm(dataloader, desc=f"Epoch {epoch}")
        
        for batch_idx, batch in enumerate(progress_bar):
            # Move batch to device
            input_ids = batch['input_ids'].to(self.device)
            pixel_values = batch['pixel_values'].to(self.device)
            
            if 'attention_mask' in batch:
                attention_mask = batch['attention_mask'].to(self.device)
            else:
                attention_mask = None
            
            # Forward pass
            outputs = self.model(
                input_ids=input_ids,
                attention_mask=attention_mask,
                pixel_values=pixel_values,
                return_loss=False
            )
            
            # Get embeddings
            image_embeds = outputs.image_embeds
            text_embeds = outputs.text_embeds
            
            # Compute contrastive loss
            loss = self.compute_contrastive_loss(image_embeds, text_embeds)
            
            # Backward pass
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
            
            # Update progress bar
            progress_bar.set_postfix({'loss': f'{loss.item():.4f}'})
            
            if batch_idx % 100 == 0:
                logger.info(f"Epoch {epoch}, Batch {batch_idx}, Loss: {loss.item():.4f}")
        
        return total_loss / len(dataloader)
    
    def save_model(self, output_dir):
        """Save the trained model"""
        os.makedirs(output_dir, exist_ok=True)
        self.model.save_pretrained(output_dir)
        self.processor.save_pretrained(output_dir)
        logger.info(f"Model saved to {output_dir}")

def collate_fn(batch):
    """Custom collate function to handle variable length sequences"""
    # Separate different types of data
    input_ids = [item['input_ids'] for item in batch]
    pixel_values = [item['pixel_values'] for item in batch]
    attention_masks = [item.get('attention_mask', torch.ones_like(item['input_ids'])) for item in batch]
    
    # Pad sequences to the same length
    max_length = max(len(ids) for ids in input_ids)
    
    padded_input_ids = []
    padded_attention_masks = []
    
    for ids, mask in zip(input_ids, attention_masks):
        # Pad input_ids
        if len(ids) < max_length:
            padding = torch.zeros(max_length - len(ids), dtype=ids.dtype)
            ids = torch.cat([ids, padding])
        
        # Pad attention_mask
        if len(mask) < max_length:
            padding = torch.zeros(max_length - len(mask), dtype=mask.dtype)
            mask = torch.cat([mask, padding])
        
        padded_input_ids.append(ids)
        padded_attention_masks.append(mask)
    
    # Stack tensors
    return {
        'input_ids': torch.stack(padded_input_ids),
        'attention_mask': torch.stack(padded_attention_masks),
        'pixel_values': torch.stack(pixel_values)
    }

def train_siglip_model(image_paths, output_dir="./fashion_siglip_model", num_epochs=3, batch_size=16, learning_rate=1e-5):
    """Main training function"""
    logger.info("Starting SigLIP model training for fashion items using local images...")
    
    # Load model and processor
    model_name = "google/siglip-base-patch16-224"
    processor = AutoProcessor.from_pretrained(model_name)
    model = AutoModel.from_pretrained(model_name)
    
    # Setup device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    logger.info(f"Using device: {device}")
    
    # Create dataset
    dataset = LocalFashionDataset(image_paths, processor)
    
    # Split data (80% train, 20% eval)
    random.shuffle(image_paths)
    split_idx = int(0.8 * len(image_paths))
    train_images = image_paths[:split_idx]
    eval_images = image_paths[split_idx:]
    
    train_dataset = LocalFashionDataset(train_images, processor)
    eval_dataset = LocalFashionDataset(eval_images, processor)
    
    logger.info(f"Training on {len(train_images)} images, evaluating on {len(eval_images)} images")
    
    # Create dataloaders
    train_dataloader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=0, collate_fn=collate_fn)
    eval_dataloader = DataLoader(eval_dataset, batch_size=batch_size, shuffle=False, num_workers=0, collate_fn=collate_fn)
    
    # Create trainer
    trainer = SigLIPTrainer(model, processor, device)
    
    # Setup optimizer
    optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate)
    
    # Training loop
    best_loss = float('inf')
    
    for epoch in range(num_epochs):
        logger.info(f"Starting epoch {epoch + 1}/{num_epochs}")
        
        # Train
        train_loss = trainer.train_epoch(train_dataloader, optimizer, epoch + 1)
        
        # Evaluate
        trainer.model.eval()
        eval_loss = 0
        with torch.no_grad():
            for batch in tqdm(eval_dataloader, desc="Evaluating"):
                input_ids = batch['input_ids'].to(device)
                pixel_values = batch['pixel_values'].to(device)
                
                if 'attention_mask' in batch:
                    attention_mask = batch['attention_mask'].to(device)
                else:
                    attention_mask = None
                
                outputs = trainer.model(
                    input_ids=input_ids,
                    attention_mask=attention_mask,
                    pixel_values=pixel_values,
                    return_loss=False
                )
                
                image_embeds = outputs.image_embeds
                text_embeds = outputs.text_embeds
                loss = trainer.compute_contrastive_loss(image_embeds, text_embeds)
                eval_loss += loss.item()
        
        eval_loss /= len(eval_dataloader)
        
        logger.info(f"Epoch {epoch + 1}: Train Loss: {train_loss:.4f}, Eval Loss: {eval_loss:.4f}")
        
        # Save best model
        if eval_loss < best_loss:
            best_loss = eval_loss
            trainer.save_model(output_dir)
            logger.info(f"New best model saved with eval loss: {eval_loss:.4f}")
    
    # Save final model
    trainer.save_model(output_dir)
    
    # Save training metadata
    metadata = {
        'model_name': model_name,
        'training_date': datetime.now().isoformat(),
        'num_train_images': len(train_images),
        'num_eval_images': len(eval_images),
        'num_epochs': num_epochs,
        'batch_size': batch_size,
        'learning_rate': learning_rate,
        'best_eval_loss': best_loss,
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
    parser.add_argument("--batch_size", type=int, default=16, help="Batch size")
    parser.add_argument("--learning_rate", type=float, default=1e-5, help="Learning rate")
    
    args = parser.parse_args()
    
    # Load images
    logger.info("Loading images from downloaded_images")
    image_paths = []
    images_path = Path("downloaded_images")
    
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
    
    # Train model
    train_siglip_model(
        image_paths, 
        output_dir=args.output_dir, 
        num_epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.learning_rate
    )

if __name__ == "__main__":
    main()
