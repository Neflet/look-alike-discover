// lib/search-image.ts
import { createClient } from '@supabase/supabase-js';
import { filterBySimilarity, categorizeMatches, STRONG_MATCH_THRESHOLD, WEAK_MATCH_THRESHOLD } from './similarity-filter';

type EmbedResponse = {
  embedding: number[];
  dim: number;
  model: string; // e.g., 'google/siglip-so400m-patch14-384'
};

export type ProductCategory = 
  | 'dress' 
  | 'top' 
  | 'skirt' 
  | 'pants' 
  | 'shorts' 
  | 'outerwear' 
  | 'shoes' 
  | 'bag' 
  | 'belt' 
  | 'accessory' 
  | 'other';

// Internal type from DB (category may be null)
type SearchHitFromDB = {
  id: string;
  title: string;
  price?: number;
  currency?: string;
  category?: string | null; // May be null from DB
  brand?: string;
  color?: string;
  url?: string;
  main_image_url?: string;
  similarity?: number;
  cos_distance?: number;
};

// Public type (category always present after normalization)
export type SearchHit = {
  id: string;
  title: string;
  price?: number;
  currency?: string;
  category: ProductCategory; // Required - normalized from DB
  brand?: string;
  color?: string;
  url?: string;
  main_image_url?: string;
  similarity?: number;     // exposed by RPC (1.0 = identical, 0.0 = completely different)
  cos_distance?: number;   // exposed by RPC (0.0 = identical, 1.0 = completely different)
};

export type MatchStatus = 'none' | 'weak' | 'strong';

export type SearchResponse = {
  results: SearchHit[];
  matchStatus: MatchStatus;
  resultsCount: number;
  predictedCategory?: ProductCategory;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Category labels for zero-shot classification
const CATEGORIES: ProductCategory[] = [
  'dress', 'top', 'skirt', 'pants', 'shorts', 'outerwear',
  'shoes', 'bag', 'belt', 'accessory'
];

/**
 * Normalize category string to ProductCategory type
 * Handles null, undefined, and various category name variations
 */
function normalizeCategory(category: string | null | undefined): ProductCategory {
  if (!category) return 'other';
  
  const normalized = category.toLowerCase().trim();
  
  // Map common variations to standard categories
  const categoryMap: Record<string, ProductCategory> = {
    'tops': 'top',
    'top': 'top',
    'bottom': 'pants',
    'bottoms': 'pants',
    'pants': 'pants',
    'trousers': 'pants',
    'accessories': 'accessory',
    'accessory': 'accessory',
    'outerwear': 'outerwear',
    'jacket': 'outerwear',
    'coat': 'outerwear',
    'dress': 'dress',
    'dresses': 'dress',
    'skirt': 'skirt',
    'skirts': 'skirt',
    'shorts': 'shorts',
    'short': 'shorts',
    'shoes': 'shoes',
    'shoe': 'shoes',
    'footwear': 'shoes',
    'bag': 'bag',
    'bags': 'bag',
    'handbag': 'bag',
    'belt': 'belt',
    'belts': 'belt',
  };
  
  const mapped = categoryMap[normalized];
  if (mapped) return mapped;
  
  // Validate against allowed categories
  const validCategories: ProductCategory[] = ['dress', 'top', 'skirt', 'pants', 'shorts', 'outerwear', 'shoes', 'bag', 'belt', 'accessory', 'other'];
  if (validCategories.includes(normalized as ProductCategory)) {
    return normalized as ProductCategory;
  }
  
  return 'other';
}

/**
 * Predict category from image embedding using zero-shot classification
 * Uses CLIP to compute similarity between image and text prompts
 */
export async function predictCategory(
  imageEmbedding: number[],
  model: string
): Promise<ProductCategory> {
  try {
    // Create text embeddings for each category
    // We'll use the same CLIP model to embed text prompts
    const categoryPrompts = CATEGORIES.map(cat => `a ${cat}`);
    
    // For now, we'll use a simple heuristic based on the image embedding
    // In a full implementation, we'd embed the text prompts and compare
    // For MVP, we can use the embed-image function with text-to-image similarity
    // or implement a separate text embedding endpoint
    
    // Since we don't have direct text embedding in the current setup,
    // we'll use a fallback: return 'other' and let the backend handle it
    // The backend can implement proper zero-shot classification
    
    console.log('[CATEGORY] Predicting category for image embedding');
    return 'other'; // Fallback - will be improved in backend
  } catch (error) {
    console.error('[CATEGORY] Prediction failed:', error);
    return 'other';
  }
}

// Get distinct brands for dropdown
export async function getBrands(): Promise<string[]> {
  const { data, error } = await (supabase.rpc as any)('get_brands') as { data: { brand: string }[] | null; error: any };
  
  if (error) {
    console.error('[RPC] get_brands error', error);
    return [];
  }
  
  return (data ?? []).map(row => row.brand).filter(Boolean);
}

function assertEmbedding(e: number[], model: string) {
  if (!Array.isArray(e) || e.length !== 1152) {
    console.error('[embed] bad shape', { len: e?.length, model });
    throw new Error('Embedding must be length 1152');
  }
}

export async function embedImage(file: File): Promise<EmbedResponse> {
  const isProd = process.env.NODE_ENV === 'production';
  const LOCAL_ENCODER = 'http://localhost:8001/embed';
  
  // Try local encoder server first (only in development)
  if (!isProd) {
    try {
      console.log('[EMBED-FN] trying local encoder at', LOCAL_ENCODER);
      const fd = new FormData();
      fd.append('file', file);
      
      const res = await fetch(LOCAL_ENCODER, {
        method: 'POST',
        body: fd,
      });
      
      if (res.ok) {
        const data = await res.json();
        const embedding = data.embedding || data.vector;
        const dim = data.dims || data.dim || embedding?.length;
        const model = data.model || 'google/siglip-so400m-patch14-384';
        
        assertEmbedding(embedding, model);
        if (dim !== 1152) throw new Error(`Unexpected dim ${dim}`);
        
        console.log('[EMBED-FN] local encoder ok', { len: embedding.length, model });
        return { embedding, dim, model };
      }
    } catch (localErr) {
      console.log('[EMBED-FN] local encoder failed, trying /api/embed:', localErr);
    }
  }
  
  // Try /api/embed route (proxies to HF endpoint)
  try {
    console.log('[EMBED-FN] downscaling image if needed, then converting to base64');
    // Downscale large images before base64 to prevent 413 errors
    const processedFile = await downscaleImageIfNeeded(file);
    const inputs = await fileToBase64(processedFile);
    
    const res = await fetch('/api/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs }),
    });
    
    if (res.ok) {
      const data = await res.json();
      const embedding = data.embedding;
      const dim = embedding?.length || 1152;
      const model = 'google/siglip-so400m-patch14-384';
      
      assertEmbedding(embedding, model);
      if (dim !== 1152) throw new Error(`Unexpected dim ${dim}`);
      
      console.log('[EMBED-FN] /api/embed ok', { len: embedding.length, model });
      return { embedding, dim, model };
    } else {
      const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || 'Embedding failed');
    }
  } catch (apiErr) {
    console.log('[EMBED-FN] /api/embed failed, trying edge function:', apiErr);
  }
  
  // Fallback to Supabase edge function
  const fd = new FormData();
  fd.append('file', file);

  console.log('[EMBED-FN] invoking embed-image edge function…');
  const { data, error } = await supabase.functions.invoke<EmbedResponse>('embed-image', {
    body: fd,
  });
  if (error) throw error;

  const { embedding, dim, model } = data!;
  assertEmbedding(embedding, model);
  if (dim !== 1152) throw new Error(`Unexpected dim ${dim}`);

  console.log('[EMBED-FN] ok', { len: embedding.length, model });
  return data!;
}

// Helper to downscale image before base64 (prevents 413 errors on mobile photos)
async function downscaleImageIfNeeded(file: File): Promise<File> {
  // Only downscale if file is larger than 2MB
  if (file.size < 2 * 1024 * 1024) {
    return file;
  }

  // Check if we're in browser (has Image and canvas)
  if (typeof window === 'undefined' || !window.Image || !document.createElement) {
    return file;
  }

  try {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(file); // Fallback to original if canvas not available
        return;
      }

      img.onload = () => {
        // Calculate new dimensions (max 768px on longest edge)
        const maxDimension = 768;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress to JPEG quality 0.7
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file); // Fallback to original
              return;
            }
            const downscaledFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(downscaledFile);
          },
          'image/jpeg',
          0.7
        );
      };

      img.onerror = () => resolve(file); // Fallback to original on error
      img.src = URL.createObjectURL(file);
    });
  } catch {
    return file; // Fallback to original on any error
  }
}

// Helper to convert File to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:image/...;base64, prefix if present
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export type SearchOptions = {
  topK?: number;           // default 5
  minSimilarity?: number;  // default 0.55
};

export type SearchFilters = {
  priceMin?: number;
  priceMax?: number;
  brand?: string; // plain text, we'll convert to '%brand%'
};

export async function searchSimilar(
  embedding: number[],
  model: string,
  opts: SearchOptions = {}
): Promise<SearchHit[]> {
  assertEmbedding(embedding, model);

  const finalLimit = opts.topK ?? 5;
  const candidatePoolSize = 50; // Get larger candidate pool for filtering

  // Call the **vector overload** (qvec: vector(1152))
  console.log('[RPC] calling search_products_siglip', { candidatePoolSize, finalLimit, model });

  // Use the explicitly named function to avoid overload resolution issues
  const { data, error } = await supabase.rpc('search_products_siglip', {
    qvec: embedding, // supabase-js will serialize the array; DB function accepts vector(1152)
    p_model_id: model,
    top_k: candidatePoolSize, // Get larger candidate pool
  }) as { data: SearchHitFromDB[] | null; error: any };

  if (error) {
    console.error('[RPC] error', error);
    throw error;
  }

  const rawResults = (data ?? []) as SearchHitFromDB[];
  console.log('[RPC] raw results', rawResults.length);

  // Normalize categories (handle nulls from DB)
  const normalizedResults: SearchHit[] = rawResults.map(r => ({
    ...r,
    category: normalizeCategory(r.category),
  }));

  // Filter by similarity threshold and limit to final count
  const filteredResults = filterBySimilarity(normalizedResults, finalLimit);
  console.log('[RPC] filtered results', filteredResults.length);

  return filteredResults;
}

export type SearchFiltersWithCategory = SearchFilters & {
  category?: ProductCategory;
};

export async function searchSimilarFiltered(
  embedding: number[],
  model: string,
  opts: SearchOptions & SearchFilters = {}
): Promise<SearchHit[]> {
  assertEmbedding(embedding, model);

  const finalLimit = opts.topK ?? 5;
  const candidatePoolSize = 50; // Get larger candidate pool for filtering

  // Build filter params - pass null for optional filters that aren't provided
  // For brand, use exact match since we're using dropdown now
  const rpcParams: any = {
    qvec: embedding as unknown as any,
    p_model_id: model,
    top_k: candidatePoolSize, // Get larger candidate pool
    price_min: typeof opts.priceMin === 'number' ? opts.priceMin : null,
    price_max: typeof opts.priceMax === 'number' ? opts.priceMax : null,
    brand_eq: opts.brand && opts.brand.trim() ? opts.brand.trim() : null,
  };

  console.log('[RPC] calling search_products_filtered with params:', {
    candidatePoolSize: rpcParams.top_k,
    finalLimit,
    price_min: rpcParams.price_min ?? 'null',
    price_max: rpcParams.price_max ?? 'null',
    brand_eq: rpcParams.brand_eq ?? 'null',
  });

  const { data, error } = await supabase.rpc('search_products_filtered', rpcParams) as { data: SearchHit[] | null; error: any };

  if (error) {
    console.error('[RPC] filtered error', error);
    // Provide more helpful error messages
    if (error.message?.includes('function') || error.message?.includes('does not exist')) {
      throw new Error('Database function not found. Please run the migration: supabase db push');
    }
    throw error;
  }

  const rawResults = (data ?? []) as SearchHitFromDB[];
  console.log('[RPC] raw filtered results', rawResults.length);

  // Normalize categories (handle nulls from DB)
  const normalizedResults: SearchHit[] = rawResults.map(r => ({
    ...r,
    category: normalizeCategory(r.category),
  }));

  // Filter by similarity threshold and limit to final count
  const filteredResults = filterBySimilarity(normalizedResults, finalLimit);
  console.log('[RPC] filtered by similarity', filteredResults.length);

  return filteredResults;
}

/**
 * Enhanced search with category filtering and match status
 * Returns SearchResponse with matchStatus and predictedCategory
 */
export async function searchSimilarWithCategory(
  embedding: number[],
  model: string,
  opts: SearchOptions & SearchFiltersWithCategory & { predictedCategory?: ProductCategory } = {}
): Promise<SearchResponse> {
  assertEmbedding(embedding, model);

  const candidatePoolSize = 100; // Large pool to account for category filtering

  // Step 1: Get predicted category if not provided
  let predictedCategory = opts.predictedCategory;
  if (!predictedCategory) {
    predictedCategory = await predictCategory(embedding, model);
  }

  // Step 2: Search with category filter
  // Only filter by category if:
  // 1. User explicitly provided a category filter, OR
  // 2. We predicted a specific category (not 'other')
  // Don't filter if predictedCategory is 'other' - that would filter out everything
  const categoryToFilter = opts.category || (predictedCategory && predictedCategory !== 'other' ? predictedCategory : null);
  
  // Determine which search function to use based on filters
  const hasPriceFilters = typeof opts.priceMin === 'number' || typeof opts.priceMax === 'number';
  const hasBrandFilter = opts.brand && opts.brand.trim();
  
  let { data, error } = { data: null as SearchHitFromDB[] | null, error: null as any };
  
  // If we have price filters, try search_products_filtered (supports price but may not have category)
  if (hasPriceFilters) {
    console.log('[RPC] calling search_products_filtered (has price filters):', {
      candidatePoolSize,
      priceMin: opts.priceMin,
      priceMax: opts.priceMax,
      brand: opts.brand,
    });
    
    const rpcParams: any = {
      qvec: embedding as unknown as any,
      p_model_id: model,
      top_k: candidatePoolSize,
      price_min: typeof opts.priceMin === 'number' ? opts.priceMin : null,
      price_max: typeof opts.priceMax === 'number' ? opts.priceMax : null,
      brand_eq: hasBrandFilter ? opts.brand?.trim() : null,
    };
    
    const result = await supabase.rpc('search_products_filtered', rpcParams) as { data: SearchHitFromDB[] | null; error: any };
    data = result.data;
    error = result.error;
    
    // If error about unknown parameter, fall back to search_products_siglip
    if (error && (error.message?.includes('does not exist') || error.message?.includes('unknown parameter'))) {
      console.log('[RPC] search_products_filtered failed, falling back to search_products_siglip');
      error = null;
      const fallback = await supabase.rpc('search_products_siglip', {
        qvec: embedding,
        p_model_id: model,
        top_k: candidatePoolSize,
      }) as { data: SearchHitFromDB[] | null; error: any };
      data = fallback.data;
      error = fallback.error;
    }
  } else {
    // No price filters - use search_products_siglip which returns category
    console.log('[RPC] calling search_products_siglip (will filter by category/brand in TypeScript):', {
      candidatePoolSize,
      categoryToFilter,
      brand: opts.brand,
      predictedCategory,
    });

    const result = await supabase.rpc('search_products_siglip', {
      qvec: embedding,
      p_model_id: model,
      top_k: candidatePoolSize,
    }) as { data: SearchHitFromDB[] | null; error: any };
    data = result.data;
    error = result.error;
  }

  if (error) {
    console.error('[RPC] search error', error);
    throw error;
  }

  let rawResults = (data ?? []) as SearchHitFromDB[];
  console.log('[RPC] raw results from DB:', rawResults.length);
  
  // Normalize and ensure all results have category (default to 'other' if missing)
  let normalizedResults: SearchHit[] = rawResults.map(r => ({
    ...r,
    category: normalizeCategory(r.category),
  }));

  // Filter by brand if provided (in TypeScript)
  if (opts.brand && opts.brand.trim()) {
    normalizedResults = normalizedResults.filter(r => 
      r.brand?.toLowerCase() === opts.brand?.toLowerCase()
    );
    console.log('[RPC] filtered by brand in TypeScript', opts.brand, 'results:', normalizedResults.length);
  }

  // Filter by price if provided
  // Note: If hasPriceFilters is true, we used search_products_filtered which already filtered by price in DB
  // If hasPriceFilters is false but we have price opts, we used search_products_siglip so filter in TypeScript
  if (!hasPriceFilters) {
    // We used search_products_siglip, so filter price in TypeScript if needed
    if (typeof opts.priceMin === 'number') {
      normalizedResults = normalizedResults.filter(r => r.price != null && r.price >= opts.priceMin!);
      console.log('[RPC] filtered by priceMin in TypeScript', opts.priceMin, 'results:', normalizedResults.length);
    }
    if (typeof opts.priceMax === 'number') {
      normalizedResults = normalizedResults.filter(r => r.price != null && r.price <= opts.priceMax!);
      console.log('[RPC] filtered by priceMax in TypeScript', opts.priceMax, 'results:', normalizedResults.length);
    }
  }
  // If hasPriceFilters is true, price filtering was already done by search_products_filtered in DB

  // Filter by category if we have a valid category to filter by
  if (categoryToFilter && categoryToFilter !== 'other') {
    normalizedResults = normalizedResults.filter(r => r.category === categoryToFilter);
    console.log('[RPC] filtered by category in TypeScript', categoryToFilter, 'results:', normalizedResults.length);
  }

  // Apply similarity thresholds and categorize matches
  console.log('[RPC] Before categorization:', {
    totalResults: normalizedResults.length,
    sampleSimilarities: normalizedResults.slice(0, 5).map(r => r.similarity),
  });
  
  const { strongMatches, weakMatches, matchStatus } = categorizeMatches(normalizedResults);

  // Determine which results to return
  let finalResults: SearchHit[];
  if (matchStatus === 'strong') {
    finalResults = strongMatches;
  } else if (matchStatus === 'weak') {
    finalResults = weakMatches;
  } else {
    finalResults = [];
  }

  // Limit results
  const limit = opts.topK ?? 5;
  finalResults = finalResults.slice(0, limit);

  console.log('[RPC] final results', {
    matchStatus,
    count: finalResults.length,
    strongMatches: strongMatches.length,
    weakMatches: weakMatches.length,
    thresholds: { strong: STRONG_MATCH_THRESHOLD, weak: WEAK_MATCH_THRESHOLD },
  });

  return {
    results: finalResults,
    matchStatus,
    resultsCount: finalResults.length,
    predictedCategory,
  };
}
