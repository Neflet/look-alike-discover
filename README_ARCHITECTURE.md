# SwagAI Modular Monolith Architecture

## Overview

SwagAI has been refactored into a **modular monolith** architecture for better maintainability, testability, and scalability. The system is organized into clear domain boundaries with well-defined interfaces.

## Architecture Diagram

```
┌─────────────────────────────────────┐
│            Frontend (React)          │
├─────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────────┐ │
│  │  Components │ │     Pages       │ │
│  └─────────────┘ └─────────────────┘ │
├─────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────────┐ │
│  │   Services  │ │     Hooks       │ │
│  └─────────────┘ └─────────────────┘ │
├─────────────────────────────────────┤
│        Search Domain (Core)         │
│  ┌─────────────┐ ┌─────────────────┐ │
│  │  Services   │ │   Components    │ │
│  │ - Search    │ └─────────────────┘ │
│  │ - Detection │                     │
│  │ - Vector    │                     │
│  │ - Reranker  │                     │
│  │ - Eval      │                     │
│  └─────────────┘                     │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│       Backend Services              │
│  ┌─────────────┐ ┌─────────────────┐ │
│  │ FastAPI     │ │   Supabase      │ │
│  │ - SigLIP    │ │ - Vector DB     │ │
│  │ - YOLOv8    │ │ - Auth          │ │
│  │ - Reranking │ │ - Analytics     │ │
│  └─────────────┘ └─────────────────┘ │
└─────────────────────────────────────┘
```

## Domain Structure

### Search Domain (`src/domains/search/`)

The core search functionality is encapsulated in its own domain:

```
src/domains/search/
├── types.ts                 # Domain types and interfaces
├── services/
│   ├── SearchService.ts     # Main orchestration service
│   ├── ModelAdapter.ts      # Swappable model interface
│   ├── DetectionService.ts  # Garment detection
│   ├── VectorSearchService.ts # ANN search
│   ├── RerankerService.ts   # Result reranking
│   └── EvaluationService.ts # Performance evaluation
├── components/
│   └── GarmentSelector.tsx  # Garment selection UI
└── index.ts                 # Domain exports
```

### Key Design Principles

1. **Separation of Concerns**: Each service has a single responsibility
2. **Dependency Injection**: Services can be easily swapped or mocked
3. **Interface-Based Design**: Clear contracts between components
4. **Modular**: Features can be developed and tested independently

## Services Architecture

### SearchService (Orchestrator)
- Coordinates the entire search pipeline
- Handles garment detection → cropping → embedding → search → reranking
- Manages fallbacks and error handling

### ModelAdapter (Strategy Pattern)
- Abstracts embedding model implementation
- Supports multiple models (SigLIP, EVA02-CLIP, CLIP)
- Easy model switching via configuration

### DetectionService
- Handles garment detection using YOLOv8/RT-DETR
- Maps detection labels to product categories
- Provides bounding box coordinates

### VectorSearchService
- Performs approximate nearest neighbor search
- Applies filters (price, category, brand, color)
- Uses pgvector with HNSW indexing

### RerankerService
- Re-embeds at higher resolution for top candidates
- Applies color/silhouette heuristics
- Combines similarity scores with business logic

### EvaluationService
- Measures search performance (Recall@K, MRR)
- Loads evaluation datasets
- Runs benchmark tests

## Database Schema

### New Tables

```sql
-- Enhanced embedding storage
product_embeddings (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL,
  image_id TEXT NOT NULL,        -- 'main', 'img_1', etc.
  model_id TEXT NOT NULL,        -- 'siglip-vit-so400m-14-384'
  dimensions INTEGER NOT NULL,    -- 1152 for SigLIP
  embedding vector(1152) NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(product_id, image_id, model_id)
);

-- Query analytics and persistence
query_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT NOT NULL,
  original_image_url TEXT NOT NULL,
  bounding_box JSONB,
  category_hint TEXT,
  filters JSONB,
  detected_garments JSONB,
  results_count INTEGER,
  search_time_ms INTEGER,
  model_id TEXT,
  created_at TIMESTAMP DEFAULT now()
);
```

### Enhanced Search Function

```sql
-- Server-side search with filtering
search_products_enhanced(
  query_embedding vector(1152),
  p_model_id text DEFAULT 'siglip-vit-so400m-14-384',
  p_limit integer DEFAULT 50,
  p_price_min numeric DEFAULT 0,
  p_price_max numeric DEFAULT 999999,
  p_categories text[] DEFAULT NULL,
  p_brands text[] DEFAULT NULL,
  p_colors text[] DEFAULT NULL
) RETURNS TABLE(...)
```

## API Endpoints

### New Backend Endpoints

```
POST /embed                    # Generate single embedding
POST /embed/batch             # Generate batch embeddings
POST /detect                  # Detect garments in image
POST /search/vector           # Vector similarity search
POST /search/multimodal       # Text + image search
POST /rerank                  # Rerank results
GET  /health                  # Health check with model info
```

## Scripts and Tools

### Reindexing Script (`scripts/reindex.py`)
```bash
# Reindex all products with new model
python scripts/reindex.py --model siglip-vit-so400m-14-384

# Custom batch size
python scripts/reindex.py --model eva02-clip-vit-g-14 --batch-size 16
```

### Evaluation Script (`scripts/eval.py`)
```bash
# Run evaluation
python scripts/eval.py --dataset data/eval_queries.json

# Create sample dataset
python scripts/eval.py --create-sample
```

## Model Configuration

Models are configured through the ModelAdapter:

```typescript
const models = {
  'siglip-vit-so400m-14-384': {
    dimensions: 1152,
    batch_size: 32,
    max_image_size: 384
  },
  'eva02-clip-vit-g-14': {
    dimensions: 1024,
    batch_size: 16,
    max_image_size: 224
  }
};
```

## Performance Targets

- **Recall@5**: ≥ 0.75
- **Recall@10**: ≥ 0.85
- **Search Latency**: ≤ 200ms end-to-end (excluding upload)
- **Vector Count**: 200K+ products

## Development Workflow

### Adding New Features

1. **Define Domain Types**: Add interfaces to `types.ts`
2. **Implement Service**: Create service class with clear interface
3. **Add Tests**: Unit tests for service logic
4. **Update Orchestrator**: Integrate with SearchService
5. **Add UI Components**: If needed, in domain components
6. **Export**: Add to domain index

### Model Updates

1. Update ModelAdapter configuration
2. Run reindex script with new model
3. Update evaluation benchmarks
4. Deploy backend with new model support

### Database Changes

1. Create migration with new schema
2. Update types from Supabase
3. Update search functions if needed
4. Run data migration if required

## Benefits of This Architecture

1. **Maintainability**: Clear separation makes code easier to understand and modify
2. **Testability**: Each service can be tested in isolation
3. **Scalability**: Services can be extracted to microservices if needed
4. **Flexibility**: Easy to swap implementations (models, search algorithms)
5. **Performance**: Optimized pipeline with server-side filtering and reranking

## Migration Guide

### From Old Architecture

The old monolithic approach has been replaced with:

- **Single API service** → **Domain-specific services**
- **Client-side filtering** → **Server-side ANN search**
- **Single embedding** → **Multiple embeddings per product**
- **Fixed model** → **Swappable model architecture**
- **Basic similarity** → **Detection + crop + rerank pipeline**

### Backward Compatibility

The `FashionApiService` maintains backward compatibility while using the new domain services internally.