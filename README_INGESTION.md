# Product Data Ingestion Script

## Overview
This script processes scraped product data from 26 JSON files and ingests them into Supabase tables. It normalizes product records, extracts images and sizes, and handles deduplication.

## What It Does

### Data Processing
- **Files Processed**: 26 JSON files from `data/raw/`
- **Total Raw Items**: 26,303 products
- **Unique Products**: 10,601 (after deduplication)
- **Images**: Extracts up to 6 images per product
- **Sizes**: Extracts sizes from variants and size arrays

### Normalization
Each product is normalized to:
```json
{
  "title": "Product Name",
  "brand": "Brand Name", 
  "price": 99.99,
  "currency": "USD",
  "category": "Category",
  "color": "Color",
  "url": "Product URL",
  "main_image_url": "Primary Image",
  "images": ["image1", "image2", ...],
  "sizes": ["S", "M", "L", ...],
  "gender": "Gender"
}
```

### Deduplication
- **Within files**: Removes duplicate URLs within each file
- **Across files**: Removes duplicate URLs across all files
- **Database**: Checks against existing products in Supabase

## Setup

### 1. Environment Variables
Set these environment variables:
```bash
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here"
```

### 2. Supabase Tables
Ensure you have these tables in your Supabase database:
- `products` - Main product information
- `product_images` - Product images with positions
- `product_sizes` - Product size variations (optional)

## Usage

### Test Mode (Default)
```bash
node scripts/ingest_all.js
```
This runs without database operations to verify data processing.

### Production Mode
1. Set `TEST_MODE = false` in the script
2. Provide `SUPABASE_SERVICE_ROLE_KEY` environment variable
3. Run:
```bash
node scripts/ingest_all.js
```

## File Structure
```
data/
├── raw/                    # Source JSON files
│   ├── adidas_complete_data.json
│   ├── nike_complete_data.json
│   ├── uniqlo_complete_data.json
│   └── ... (26 total files)
└── scripts/
    └── ingest_all.js      # Main ingestion script
```

## Data Sources
The script processes data from various fashion brands:
- **Sportswear**: Adidas, Nike, New Balance
- **Fashion**: Rick Owens, Wales Bonner, Mowalola
- **Retail**: Uniqlo, The Row, Paloma Wool
- **Designer**: Maisie Wilen, Nensi Dojaka, Ottolinger

## Performance
- **Chunk Size**: 500 products per database insert
- **Memory Efficient**: Processes files sequentially
- **Error Handling**: Continues processing if individual files fail

## Output
The script provides detailed logging:
- File-by-file processing status
- Item counts at each stage
- Deduplication results
- Insertion summaries

## Notes
- **Node.js Version**: Requires Node.js 20+ for Supabase compatibility
- **Memory**: Large files (like Nike with 1,126 items) are processed in chunks
- **Images**: Limited to 6 images per product to prevent excessive storage
- **Sizes**: Extracted from both explicit size arrays and variant objects 