#!/usr/bin/env python3
"""
Fashion Image Downloader
Downloads all images from the 28 JSON files in the output directory
"""

import json
import os
import requests
import time
import hashlib
from urllib.parse import urlparse, unquote
from pathlib import Path
import concurrent.futures
from tqdm import tqdm
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class FashionImageDownloader:
    def __init__(self, output_dir="output", download_dir="downloaded_images", max_workers=10):
        self.output_dir = Path(output_dir)
        self.download_dir = Path(download_dir)
        self.max_workers = max_workers
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        
        # Create download directory
        self.download_dir.mkdir(exist_ok=True)
        
        # Track downloaded images to avoid duplicates
        self.downloaded_urls = set()
        self.failed_downloads = []
        
    def get_json_files(self):
        """Get all JSON files from the output directory"""
        json_files = list(self.output_dir.glob("*.json"))
        logger.info(f"Found {len(json_files)} JSON files")
        return json_files
    
    def extract_image_urls_from_json(self, json_file):
        """Extract all image URLs from a JSON file"""
        brand_name = json_file.stem.replace('_complete_data', '').replace('_data', '')
        image_urls = []
        
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            for item in data:
                # Handle different JSON structures
                if isinstance(item, dict):
                    # Adidas/Nike style structure
                    if 'mainImage' in item:
                        image_urls.append({
                            'url': item['mainImage'],
                            'brand': item.get('brand', brand_name),
                            'product_name': item.get('name', 'unknown'),
                            'type': 'main'
                        })
                    
                    if 'images' in item and isinstance(item['images'], list):
                        for i, img_url in enumerate(item['images']):
                            image_urls.append({
                                'url': img_url,
                                'brand': item.get('brand', brand_name),
                                'product_name': item.get('name', 'unknown'),
                                'type': f'secondary_{i}'
                            })
                    
                    # Carhartt style structure
                    if 'image_url' in item:
                        image_urls.append({
                            'url': item['image_url'],
                            'brand': item.get('brand', brand_name),
                            'product_name': item.get('name', 'unknown'),
                            'type': 'main'
                        })
                    
                    # Other structures
                    for key in ['image', 'img', 'photo', 'picture']:
                        if key in item and isinstance(item[key], str):
                            image_urls.append({
                                'url': item[key],
                                'brand': item.get('brand', brand_name),
                                'product_name': item.get('name', 'unknown'),
                                'type': 'main'
                            })
        
        except Exception as e:
            logger.error(f"Error processing {json_file}: {e}")
        
        return image_urls
    
    def sanitize_filename(self, filename):
        """Sanitize filename for safe file system usage"""
        # Remove or replace invalid characters
        invalid_chars = '<>:"/\\|?*'
        for char in invalid_chars:
            filename = filename.replace(char, '_')
        
        # Limit length
        if len(filename) > 200:
            filename = filename[:200]
        
        return filename
    
    def get_file_extension(self, url, content_type=None):
        """Get file extension from URL or content type"""
        # Try to get extension from URL
        parsed_url = urlparse(url)
        path = parsed_url.path
        if '.' in path:
            ext = path.split('.')[-1].lower()
            if ext in ['jpg', 'jpeg', 'png', 'webp', 'gif']:
                return ext
        
        # Try to get extension from content type
        if content_type:
            if 'jpeg' in content_type or 'jpg' in content_type:
                return 'jpg'
            elif 'png' in content_type:
                return 'png'
            elif 'webp' in content_type:
                return 'webp'
            elif 'gif' in content_type:
                return 'gif'
        
        # Default to jpg
        return 'jpg'
    
    def download_image(self, image_info):
        """Download a single image"""
        url = image_info['url']
        brand = image_info['brand']
        product_name = image_info['product_name']
        image_type = image_info['type']
        
        # Skip if already downloaded
        if url in self.downloaded_urls:
            return True
        
        try:
            # Create brand directory
            brand_dir = self.download_dir / self.sanitize_filename(brand)
            brand_dir.mkdir(exist_ok=True)
            
            # Download image
            response = self.session.get(url, timeout=30, stream=True)
            response.raise_for_status()
            
            # Get file extension
            ext = self.get_file_extension(url, response.headers.get('content-type'))
            
            # Create filename
            safe_product_name = self.sanitize_filename(product_name)
            filename = f"{safe_product_name}_{image_type}.{ext}"
            
            # If filename is too long, use hash
            if len(filename) > 150:
                url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
                filename = f"{url_hash}_{image_type}.{ext}"
            
            filepath = brand_dir / filename
            
            # Save image
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            self.downloaded_urls.add(url)
            return True
            
        except Exception as e:
            logger.error(f"Failed to download {url}: {e}")
            self.failed_downloads.append({
                'url': url,
                'brand': brand,
                'product': product_name,
                'error': str(e)
            })
            return False
    
    def download_all_images(self):
        """Download all images from all JSON files"""
        json_files = self.get_json_files()
        all_image_urls = []
        
        # Extract all image URLs
        logger.info("Extracting image URLs from JSON files...")
        for json_file in tqdm(json_files, desc="Processing JSON files"):
            image_urls = self.extract_image_urls_from_json(json_file)
            all_image_urls.extend(image_urls)
        
        logger.info(f"Found {len(all_image_urls)} total images to download")
        
        # Remove duplicates based on URL
        unique_images = {}
        for img in all_image_urls:
            if img['url'] not in unique_images:
                unique_images[img['url']] = img
        
        unique_image_list = list(unique_images.values())
        logger.info(f"After removing duplicates: {len(unique_image_list)} unique images")
        
        # Download images with progress bar
        logger.info("Starting download with concurrent workers...")
        successful_downloads = 0
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all download tasks
            future_to_image = {executor.submit(self.download_image, img): img for img in unique_image_list}
            
            # Process completed downloads with progress bar
            with tqdm(total=len(unique_image_list), desc="Downloading images") as pbar:
                for future in concurrent.futures.as_completed(future_to_image):
                    if future.result():
                        successful_downloads += 1
                    pbar.update(1)
        
        # Print summary
        logger.info(f"Download completed!")
        logger.info(f"Successfully downloaded: {successful_downloads}")
        logger.info(f"Failed downloads: {len(self.failed_downloads)}")
        
        if self.failed_downloads:
            logger.info("Failed downloads saved to failed_downloads.json")
            with open('failed_downloads.json', 'w') as f:
                json.dump(self.failed_downloads, f, indent=2)
        
        # Print brand statistics
        brand_stats = {}
        for img in unique_image_list:
            brand = img['brand']
            if brand not in brand_stats:
                brand_stats[brand] = 0
            brand_stats[brand] += 1
        
        logger.info("Images per brand:")
        for brand, count in sorted(brand_stats.items()):
            logger.info(f"  {brand}: {count} images")

def main():
    """Main function"""
    downloader = FashionImageDownloader(
        output_dir="output",
        download_dir="downloaded_images",
        max_workers=10
    )
    
    downloader.download_all_images()

if __name__ == "__main__":
    main()
