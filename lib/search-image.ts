// lib/search-image.ts
import { createClient } from '@supabase/supabase-js';

type EmbedResponse = {
  embedding: number[];
  dim: number;
  model: string; // e.g., 'google/siglip-so400m-patch14-384'
};

export type SearchHit = {
  id: string;
  title: string;
  price?: number;
  currency?: string;
  category?: string;
  brand?: string;
  color?: string;
  url?: string;
  main_image_url?: string;
  similarity?: number;     // exposed by RPC (1.0 = identical, 0.0 = completely different)
  cos_distance?: number;   // exposed by RPC (0.0 = identical, 1.0 = completely different)
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Get distinct brands for dropdown
export async function getBrands(): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_brands') as { data: { brand: string }[] | null; error: any };
  
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
  // Try local encoder server first (for development)
  const LOCAL_ENCODER = 'http://localhost:8001/embed';
  
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
    console.log('[EMBED-FN] local encoder failed, trying edge function:', localErr);
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

  const top_k = opts.topK ?? 5;
  const minSimilarity = opts.minSimilarity ?? 0.55;

  // Call the **vector overload** (qvec: vector(1152))
  console.log('[RPC] calling search_products_siglip', { top_k, model });

  // Use the explicitly named function to avoid overload resolution issues
  const { data, error } = await supabase.rpc('search_products_siglip', {
    qvec: embedding, // supabase-js will serialize the array; DB function accepts vector(1152)
    p_model_id: model,
    top_k,
  }) as { data: SearchHit[] | null; error: any };

  if (error) {
    console.error('[RPC] error', error);
    throw error;
  }

  const rows = (data ?? [])
    // keep if RPC returns similarity column; otherwise passthrough
    .filter(r => (typeof r.similarity === 'number' ? r.similarity >= minSimilarity : true));

  console.log('[RPC] results', rows.length);
  return rows;
}

export async function searchSimilarFiltered(
  embedding: number[],
  model: string,
  opts: SearchOptions & SearchFilters = {}
): Promise<SearchHit[]> {
  assertEmbedding(embedding, model);

  const top_k = opts.topK ?? 24;
  const minSimilarity = opts.minSimilarity ?? 0.55;

  // Build filter params - pass null for optional filters that aren't provided
  // For brand, use exact match since we're using dropdown now
  const rpcParams: any = {
    qvec: embedding as unknown as any,
    p_model_id: model,
    top_k,
    price_min: typeof opts.priceMin === 'number' ? opts.priceMin : null,
    price_max: typeof opts.priceMax === 'number' ? opts.priceMax : null,
    brand_eq: opts.brand && opts.brand.trim() ? opts.brand.trim() : null,
  };

  console.log('[RPC] calling search_products_filtered with params:', {
    top_k: rpcParams.top_k,
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

  const rows = (data ?? []).filter(r =>
    typeof r.similarity === 'number' ? r.similarity >= minSimilarity : true
  );

  console.log('[RPC] filtered results', rows.length);
  return rows;
}
