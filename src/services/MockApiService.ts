import { Product } from '@/types/fashion';

// Mock data for when the backend is unavailable
const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Classic White T-Shirt',
    brand: 'Cotton Co.',
    price: 29.99,
    currency: 'USD',
    imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
    buyLink: '#',
    similarity: 0.95,
    category: 'tops'
  },
  {
    id: '2',
    name: 'Denim Jacket',
    brand: 'Urban Style',
    price: 89.99,
    currency: 'USD',
    imageUrl: 'https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=400',
    buyLink: '#',
    similarity: 0.88,
    category: 'outerwear'
  },
  {
    id: '3',
    name: 'Black Sneakers',
    brand: 'Sport Brand',
    price: 129.99,
    currency: 'USD',
    imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400',
    buyLink: '#',
    similarity: 0.82,
    category: 'shoes'
  },
  {
    id: '4',
    name: 'Blue Jeans',
    brand: 'Denim Works',
    price: 79.99,
    currency: 'USD',
    imageUrl: 'https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=400',
    buyLink: '#',
    similarity: 0.78,
    category: 'bottoms'
  },
  {
    id: '5',
    name: 'Leather Handbag',
    brand: 'Luxury Bags',
    price: 199.99,
    currency: 'USD',
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
    buyLink: '#',
    similarity: 0.75,
    category: 'accessories'
  }
];

export class MockApiService {
  static async searchSimilarProducts(): Promise<{ products: Product[], searchTime: number }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Return shuffled mock products to simulate different results
    const shuffled = [...mockProducts].sort(() => Math.random() - 0.5);
    
    return {
      products: shuffled.slice(0, 4), // Return 4 random products
      searchTime: 1500
    };
  }
}