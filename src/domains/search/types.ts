// Search Domain Types
export interface SearchRequest {
  imageFile: File;
  boundingBox?: BoundingBox;
  filters?: SearchFilters;
  categoryHint?: string;
  mode?: 'single' | 'multi';
}

export interface SearchResponse {
  products: SearchResult[];
  searchTime: number;
  searchId: string;
  detectedGarments?: DetectedGarment[];
}

export interface SearchResult {
  id: string;
  name: string;
  brand: string;
  price: number;
  currency: string;
  imageUrl: string;
  buyLink: string;
  similarity: number;
  category: string;
  distance: number;
  rerankedScore?: number;
}

export interface DetectedGarment {
  id: string;
  label: string;
  confidence: number;
  bbox: BoundingBox;
  area: number;
  categoryHint: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SearchFilters {
  priceRange: [number, number];
  colors: string[];
  sizes: string[];
  categories: string[];
  brands: string[];
}

export interface ModelConfig {
  modelId: string;
  name: string;
  dimensions: number;
  maxImageSize: number;
  batchSize: number;
}

export interface QuerySession {
  id: string;
  userId?: string;
  originalImageUrl: string;
  boundingBox?: BoundingBox;
  categoryHint?: string;
  filters?: SearchFilters;
  createdAt: string;
}