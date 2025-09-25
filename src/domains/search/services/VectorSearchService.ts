import { SearchResult, SearchFilters } from '../types';

export class VectorSearchService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'http://localhost:8000';
  }

  async search(
    embedding: number[], 
    filters?: SearchFilters,
    categoryHint?: string,
    limit: number = 100
  ): Promise<SearchResult[]> {
    try {
      const response = await fetch(`${this.baseUrl}/search/vector`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embedding,
          filters: {
            price_min: filters?.priceRange[0] || 0,
            price_max: filters?.priceRange[1] || 10000,
            categories: filters?.categories || [],
            colors: filters?.colors || [],
            sizes: filters?.sizes || [],
            brands: filters?.brands || [],
            category_hint: categoryHint
          },
          limit
        }),
      });

      if (!response.ok) {
        throw new Error(`Vector search failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      return data.results.map((result: {
        product_id: string;
        name?: string;
        title?: string;
        brand: string;
        price: number;
        currency?: string;
        image_url?: string;
        main_image_url?: string;
        buy_link?: string;
        url?: string;
        distance: number;
        category: string;
      }) => ({
        id: result.product_id,
        name: result.name || result.title,
        brand: result.brand,
        price: result.price,
        currency: result.currency || 'USD',
        imageUrl: result.image_url || result.main_image_url,
        buyLink: result.buy_link || result.url,
        similarity: 1 - result.distance, // Convert distance to similarity
        category: result.category,
        distance: result.distance
      }));
    } catch (error) {
      console.error('Vector search error:', error);
      throw error;
    }
  }

  async searchMultiModal(
    textQuery: string,
    imageEmbedding?: number[],
    filters?: SearchFilters,
    limit: number = 50
  ): Promise<SearchResult[]> {
    try {
      const response = await fetch(`${this.baseUrl}/search/multimodal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text_query: textQuery,
          image_embedding: imageEmbedding,
          filters: {
            price_min: filters?.priceRange[0] || 0,
            price_max: filters?.priceRange[1] || 10000,
            categories: filters?.categories || [],
            colors: filters?.colors || [],
            brands: filters?.brands || []
          },
          limit
        }),
      });

      if (!response.ok) {
        throw new Error(`Multimodal search failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      return data.results.map((result: {
        product_id: string;
        name?: string;
        title?: string;
        brand: string;
        price: number;
        currency?: string;
        image_url?: string;
        main_image_url?: string;
        buy_link?: string;
        url?: string;
        distance: number;
        category: string;
        similarity_score: number;
      }) => ({
        id: result.product_id,
        name: result.name || result.title,
        brand: result.brand,
        price: result.price,
        currency: result.currency || 'USD',
        imageUrl: result.image_url || result.main_image_url,
        buyLink: result.buy_link || result.url,
        similarity: result.similarity_score,
        category: result.category,
        distance: result.distance
      }));
    } catch (error) {
      console.error('Multimodal search error:', error);
      throw error;
    }
  }
}