import { SearchService } from '@/domains/search';
import { SearchRequest, SearchResponse, DetectedGarment } from '@/domains/search/types';
import { Product } from '@/types/fashion';
import { MockApiService } from './MockApiService';

// Updated FashionApiService using the new modular search domain
export class FashionApiService {
  private searchService: SearchService;

  constructor() {
    this.searchService = new SearchService();
  }

  static async searchSimilarProducts(request: SearchRequest): Promise<{ products: Product[], searchTime: number }> {
    try {
      const service = new FashionApiService();
      const response = await service.searchService.searchSimilarProducts(request);
      
      // Convert SearchResult[] to Product[]
      const products: Product[] = response.products.map(result => ({
        id: result.id,
        name: result.name,
        brand: result.brand,
        price: result.price,
        currency: result.currency,
        imageUrl: result.imageUrl,
        buyLink: result.buyLink,
        similarity: result.similarity,
        category: this.mapCategoryToProductCategory(result.category)
      }));

      return {
        products,
        searchTime: response.searchTime
      };
    } catch (error) {
      console.warn('Backend search service unavailable, using mock data:', error);
      // Fallback to mock service when backend is unavailable
      return MockApiService.searchSimilarProducts();
    }
  }

  private static mapCategoryToProductCategory(category: string): 'tops' | 'bottoms' | 'shoes' | 'accessories' | 'outerwear' {
    const mapping: Record<string, 'tops' | 'bottoms' | 'shoes' | 'accessories' | 'outerwear'> = {
      'tops': 'tops',
      'bottoms': 'bottoms', 
      'shoes': 'shoes',
      'accessories': 'accessories',
      'outerwear': 'outerwear',
      'dresses': 'tops', // Map dresses to tops
      'pants': 'bottoms',
      'jeans': 'bottoms',
      'shirts': 'tops',
      'jackets': 'outerwear',
      'coats': 'outerwear',
      'bags': 'accessories',
      'jewelry': 'accessories'
    };

    return mapping[category.toLowerCase()] || 'accessories';
  }

  static async detectGarments(imageFile: File): Promise<DetectedGarment[]> {
    const service = new FashionApiService();
    return service.searchService.detectGarments(imageFile);
  }

  static async uploadImage(file: File): Promise<string> {
    // In production, upload to your server and return URL
    return URL.createObjectURL(file);
  }

  // Backward compatibility method
  static async search(request: SearchRequest): Promise<{ products: Product[], searchTime: number }> {
    return this.searchSimilarProducts(request);
  }
}