-- Create search_products overload for vector(1152) with model_id and top_k
-- This is the function called directly from frontend
-- Note: We drop the old function first if it exists, then create our new overload

DROP FUNCTION IF EXISTS public.search_products(vector(1152), text, int);

CREATE OR REPLACE FUNCTION public.search_products(
  qvec vector(1152),
  p_model_id text DEFAULT 'google/siglip-so400m-patch14-384',
  top_k int DEFAULT 24
)
RETURNS TABLE(
  id uuid,
  title text,
  price numeric,
  currency text,
  category text,
  brand text,
  color text,
  url text,
  main_image_url text,
  similarity double precision,
  cos_distance double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT 
    p.id,
    p.title,
    p.price,
    p.currency,
    p.category,
    p.brand,
    p.color,
    p.url,
    p.main_image_url,
    1.0 - (pe.embedding <=> qvec) as similarity,  -- Convert distance to similarity (1.0 = identical, 0.0 = completely different)
    (pe.embedding <=> qvec) as cos_distance       -- Cosine distance (0.0 = identical, 1.0 = completely different)
  FROM product_embeddings pe
  JOIN products p ON p.id = pe.product_id
  WHERE pe.model_id = p_model_id
  ORDER BY pe.embedding <=> qvec  -- Order by distance (closest first)
  LIMIT top_k;
$function$;
