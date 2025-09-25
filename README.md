# Fashion Finder - Visual Search with SigLIP

A mobile-first web application for finding similar fashion items using AI-powered visual search with SigLIP model.

## 🚀 Features

- **Photo Upload/Camera Capture**: Take photos or upload images of fashion items
- **Smart Cropping**: Optional bounding box selection to focus on specific items
- **Visual Search**: AI-powered similarity matching using SigLIP model
- **Product Results**: Clean, scrollable feed showing similar items with prices and buy links
- **Mobile-First Design**: Optimized for touch devices with smooth animations
- **Brand Diversity**: Ensures diverse brand representation in search results

## 🛠️ Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite for fast development
- Tailwind CSS for styling
- Shadcn UI components
- Lucide React icons

**Backend:**
- FastAPI with SigLIP model
- Transformers library for AI model inference
- Product catalog with 28+ fashion brands
- Real-time similarity search

## 📱 Screens

1. **Upload Screen**: Camera capture and file upload options
2. **Crop Screen**: Optional bounding box selection with touch gestures
3. **Loading Screen**: Animated search progress indicator
4. **Results Screen**: Grid layout showing similar fashion items

## 🏗️ Project Structure

```
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── services/          # API services
│   └── types/             # TypeScript types
├── fashion_ai_server/      # FastAPI backend
│   ├── server.py          # SigLIP-powered server
│   ├── data/              # Product images
│   └── requirements.txt   # Python dependencies
├── fashion_siglip_model/   # Custom SigLIP model
├── output/                # Product catalog data
└── scripts/               # Model training scripts
```

## 🔧 Backend Integration

The app connects to a FastAPI backend with SigLIP model:

### API Endpoints

```python
# SigLIP-powered search
@app.post("/search")
async def search_similar_products(image: UploadFile):
    # 1. Generate SigLIP embedding
    # 2. Search product catalog
    # 3. Return diverse results
    
    return {"results": [...]}

@app.post("/embed")
async def generate_embedding(image: UploadFile):
    # Generate SigLIP embedding for image
    return {"embedding": [...], "dimensions": 1152}
```

### Product Data Schema

```python
{
    "product_id": "string",
    "name": "string",
    "brand": "string", 
    "price": float,
    "currency": "USD",
    "image_url": "string",
    "buy_link": "string",
    "similarity_score": float,  # 0-1 similarity score
    "category": "string",
    "source": "string"  # Brand source
}
```

## 🚀 Getting Started

1. **Install frontend dependencies:**
   ```bash
   npm install
   ```

2. **Install backend dependencies:**
   ```bash
   cd fashion_ai_server
   pip install -r requirements.txt
   ```

3. **Start the backend server:**
   ```bash
   ./start_server.sh
   # Or manually:
   cd fashion_ai_server
   uvicorn server:app --host 0.0.0.0 --port 8000 --reload
   ```

4. **Start the frontend:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to `http://localhost:5173`

## 🎯 Supported Brands

The system includes product data from 28+ fashion brands:
- Adidas, Nike, New Balance
- Rick Owens, The Row, Wales Bonner
- Carhartt, Stussy, Noah NY
- And many more...

## 🔍 Search Features

- **Visual Similarity**: SigLIP-powered image understanding
- **Brand Diversity**: Ensures variety in search results
- **Category Filtering**: Filter by clothing categories
- **Price Range**: Filter by price range
- **Real-time Processing**: Fast search with cached embeddings

## 🧠 AI Model

- **SigLIP Base Model**: 1152-dimensional embeddings
- **Custom Fine-tuning**: Fashion-specific model training
- **Fallback Support**: Automatic fallback to base SigLIP model
- **GPU Acceleration**: CUDA support for faster inference

## 📊 Performance

- **Search Speed**: < 2 seconds for typical queries
- **Model Loading**: ~30 seconds on first startup
- **Memory Usage**: ~2GB RAM for model + catalog
- **Concurrent Users**: Supports multiple simultaneous searches

## 🔧 Development

### Adding New Brands

1. Add brand data to `output/` directory
2. Update brand list in `server.py`
3. Restart server to load new data

### Model Training

```bash
# Retrain SigLIP model with new data
python scripts/retrain_siglip_model.py

# Evaluate model performance
python scripts/eval.py
```

### API Testing

```bash
# Test search endpoint
curl -X POST "http://localhost:8000/search" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test_image.jpg"
```

## 📝 License

This project is for educational and research purposes.