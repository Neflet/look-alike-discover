import { Product, SearchRequest, SearchResponse } from '@/types/fashion';
import { mockProducts } from '@/data/mockProducts';

// Mock API service - replace with actual backend calls
export class FashionApiService {
  private static baseUrl = 'http://localhost:8000'; // Your FastAPI backend URL

  static async searchSimilarProducts(request: SearchRequest): Promise<SearchResponse> {
    const startTime = Date.now();

    try {
      const formData = new FormData();
      formData.append('file', request.imageFile);
      
      // Include bounding box if provided
      if (request.boundingBox) {
        formData.append('bbox', JSON.stringify(request.boundingBox));
      }

      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      const searchTime = Date.now() - startTime;

      // Map backend result URLs and scores to Product interface
      // New format includes: url, score, brand, name, price, product_url
      const products: Product[] = data.results?.map((item: {
        url: string;
        score: number;
        brand: string;
        name: string;
        price: number;
        product_url: string;
      }, index: number) => ({
        id: `product-${index}`,
        name: item.name || 'Matched Item',
        brand: item.brand || '',
        price: item.price || 0,
        currency: 'USD',
        imageUrl: FashionApiService.baseUrl + item.url,
        buyLink: item.product_url || FashionApiService.baseUrl + item.url,
        similarity: item.score,
        category: 'accessories'
      })) || [];

      return {
        products,
        searchTime
      };
    } catch (error) {
      console.error('Search API error:', error);
      throw new Error('Failed to search for similar products');
    }
  }

  static async uploadImage(file: File): Promise<string> {
    // In production, upload to your server and return URL
    return URL.createObjectURL(file);
  }
}