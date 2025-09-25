export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  currency: string;
  imageUrl: string;
  buyLink: string;
  similarity: number;
  category: 'tops' | 'bottoms' | 'shoes' | 'accessories' | 'outerwear';
}

export interface SearchRequest {
  imageFile: File;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  filters?: {
    priceRange: [number, number];
    colors: string[];
    sizes: string[];
    categories: string[];
  };
}

export interface SearchResponse {
  products: Product[];
  searchTime: number;
}

export interface AppState {
  currentView: 'upload' | 'crop' | 'results';
  selectedImage: File | null;
  imagePreview: string | null;
  boundingBox: { x: number; y: number; width: number; height: number } | null;
  searchResults: Product[];
  isLoading: boolean;
  error: string | null;
}