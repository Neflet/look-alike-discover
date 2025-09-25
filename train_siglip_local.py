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
from transformers import AutoModel, AutoProcessor, Trainer, TrainingArguments
from PIL import Image
from pathlib import Path
import random
from tqdm import tqdm

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LocalFashionDataset(Dataset):
    """Custom dataset for fashion items using local images"""
    
    def __init__(self, products: List[Dict], processor, max_length: int = 77):
        self.products = products
        self.processor = processor
        self.max_length = max_length
    
    def __len__(self):
        return len(self.products)
    
    def __getitem__(self, idx):
        product = self.products[idx]
        
        # Load local image
        try:
            image_path = product['local_image_path']
            image = Image.open(image_path).convert('RGB')
        except Exception as e:
            logger.warning(f"Failed to load image {product['local_image_path']}: {e}")
            # Create a blank image as fallback
            image = Image.new('RGB', (224, 224), color='white')
        
        # Create text description from metadata
        text_parts = []
        if product.get('title'):
            text_parts.append(product['title'])
        if product.get('brand'):
            text_parts.append(f"by {product['brand']}")
        if product.get('category'):
            text_parts.append(f"category: {product['category']}")
        if product.get('color'):
            text_parts.append(f"color: {product['color']}")
        
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
        
        return {
            'input_ids': inputs['input_ids'].squeeze(),
            'attention_mask': inputs['attention_mask'].squeeze(), 
            'pixel_values': inputs['pixel_values'].squeeze(),
            'product_id': product.get('id', idx)
        }

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
    
    def load_products_from_json(self, json_dir: str = "output", images_dir: str = "downloaded_images") -> List[Dict[str, Any]]:
        """Load product data from JSON files and link with local images"""
        logger.info(f"Loading products from {json_dir} and linking with images from {images_dir}")
        
        products = []
        json_path = Path(json_dir)
        images_path = Path(images_dir)
        
        # Get all JSON files
        json_files = list(json_path.glob("*.json"))
        logger.info(f"Found {len(json_files)} JSON files")
        
        for json_file in tqdm(json_files, desc="Processing JSON files"):
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    brand_data = json.load(f)
                
                brand_name = json_file.stem.replace('_complete_data', '').replace('_data', '').title()
                
                # Handle different JSON structures
                if isinstance(brand_data, list):
                    products_list = brand_data
                elif isinstance(brand_data, dict) and 'products' in brand_data:
                    products_list = brand_data['products']
                else:
                    logger.warning(f"Unknown structure in {json_file}")
                    continue
                
                # Find corresponding image directory
                brand_image_dir = None
                for img_dir in images_path.iterdir():
                    if img_dir.is_dir():
                        # Create a mapping for brand names
                        brand_mapping = {
                            'nike': 'Nike',
                            'adidas': 'Adidas',
                            'carhartt': 'Carhartt WIP',
                            'stussy': 'Stussy',
                            'uniqlo': 'Uniqlo',
                            'newbalance': 'New Balance',
                            'aunecollections': 'AuneCollections',
                            'namacheko': 'Namacheko',
                            'ottolinger': 'Otto Linger',
                            'heliotemil': 'HELIOT EMIL',
                            'noahny': 'Noah NY',
                            'aimeleondore': 'Aime Leon Dore',
                            'rickowens': 'Rick Owens',
                            'therow': 'The Row',
                            'avavav': 'Avavav',
                            'fanciclub': 'Fanci Club',
                            '032c': '032c',
                            'nensidojaka': 'Nensi Dojaka',
                            'walesbonner': 'Wales Bonner',
                            'mowalola': 'MOWALOLA',
                            'eytys': 'EYTYS',
                            'dailypaperclothing': 'Daily Paper',
                            'blumarine': 'Blumarine',
                            'jadedldn': 'Jaded London',
                            'palomawool': 'Paloma Wool',
                            'ludovicdesaintsernin': 'Ludovic de Saint Sernin',
                            'diotima': 'DIOTIMA',
                            'maisiewilen': 'Maisie Wilen'
                        }
                        
                        # Try to match using the mapping
                        mapped_brand = brand_mapping.get(brand_name.lower())
                        if mapped_brand and img_dir.name == mapped_brand:
                            brand_image_dir = img_dir
                            break
                        
                        # Fallback: try partial matching
                        if brand_name.lower() in img_dir.name.lower() or img_dir.name.lower() in brand_name.lower():
                            brand_image_dir = img_dir
                            break
                
                if not brand_image_dir:
                    logger.warning(f"No image directory found for brand {brand_name}")
                    continue
                
                # Link products with local images
                for product in products_list:
                    if not product.get('mainImage'):
                        continue
                    
                    # Extract filename from URL
                    url_path = product['mainImage']
                    filename = url_path.split('/')[-1]
                    
                    # Look for the image file
                    image_file = brand_image_dir / filename
                    if not image_file.exists():
                        # Try with different extensions
                        for ext in ['.jpg', '.jpeg', '.png', '.webp']:
                            alt_file = brand_image_dir / f"{filename.split('.')[0]}{ext}"
                            if alt_file.exists():
                                image_file = alt_file
                                break
                    
                    if image_file.exists():
                        product['local_image_path'] = str(image_file)
                        product['brand'] = brand_name
                        product['title'] = product.get('name', '')
                        products.append(product)
                
                logger.info(f"Processed {brand_name}: {len([p for p in products if p.get('brand') == brand_name])} products")
                
            except Exception as e:
                logger.error(f"Error processing {json_file}: {e}")
                continue
        
        logger.info(f"Total products with local images: {len(products)}")
        return products
    
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
        products = self.load_products_from_json()
        if len(products) < 100:
            logger.warning(f"Only {len(products)} products found. Consider adding more data for better training.")
        
        # Split data (80% train, 20% eval)
        random.shuffle(products)  # Shuffle for better distribution
        split_idx = int(0.8 * len(products))
        train_products = products[:split_idx]
        eval_products = products[split_idx:]
        
        logger.info(f"Training on {len(train_products)} products, evaluating on {len(eval_products)} products")
        
        # Create datasets
        train_dataset = LocalFashionDataset(train_products, self.processor)
        eval_dataset = LocalFashionDataset(eval_products, self.processor)
        
        # Create training arguments
        training_args = self.create_training_args(output_dir, num_epochs)
        
        # Create trainer
        trainer = Trainer(
            model=self.model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=eval_dataset,
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
            'num_train_products': len(train_products),
            'num_eval_products': len(eval_products),
            'num_epochs': num_epochs,
            'brands': list(set(p.get('brand', '') for p in products)),
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
