-- Create product embeddings table for new vector search architecture
CREATE TABLE public.product_embeddings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  image_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  dimensions INTEGER NOT NULL,
  embedding vector NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, image_id, model_id)
);

-- Enable RLS
ALTER TABLE public.product_embeddings ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "public read product_embeddings" 
ON public.product_embeddings 
FOR SELECT 
USING (true);

-- Create HNSW index for efficient similarity search
CREATE INDEX product_embeddings_hnsw_idx ON public.product_embeddings 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

-- Create index on product_id for joins
CREATE INDEX product_embeddings_product_id_idx ON public.product_embeddings (product_id);

-- Create index on model_id for filtering
CREATE INDEX product_embeddings_model_id_idx ON public.product_embeddings (model_id);

-- Create function to search products using new embedding table
CREATE OR REPLACE FUNCTION public.search_products_enhanced(
  query_embedding vector,
  p_model_id text DEFAULT 'siglip-vit-so400m-14-384',
  p_limit integer DEFAULT 50,
  p_price_min numeric DEFAULT 0,
  p_price_max numeric DEFAULT 999999,
  p_categories text[] DEFAULT NULL,
  p_brands text[] DEFAULT NULL,
  p_colors text[] DEFAULT NULL
)
RETURNS TABLE(
  product_id uuid,
  title text,
  brand text,
  price numeric,
  currency text,
  category text,
  color text,
  url text,
  main_image_url text,
  distance double precision,
  image_id text
)
LANGUAGE sql
AS $function$
  SELECT 
    p.id as product_id,
    p.title,
    p.brand,
    p.price,
    p.currency,
    p.category,
    p.color,
    p.url,
    p.main_image_url,
    (pe.embedding <=> query_embedding) as distance,
    pe.image_id
  FROM product_embeddings pe
  JOIN products p ON p.id = pe.product_id
  WHERE pe.model_id = p_model_id
    AND p.price BETWEEN p_price_min AND p_price_max
    AND (p_categories IS NULL OR p.category = ANY(p_categories))
    AND (p_brands IS NULL OR p.brand = ANY(p_brands))
    AND (p_colors IS NULL OR p.color = ANY(p_colors))
  ORDER BY pe.embedding <=> query_embedding
  LIMIT p_limit;
$function$;