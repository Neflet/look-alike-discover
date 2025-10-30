-- Add distance threshold to filter out dissimilar results
-- Cosine distance: 0.0 = identical, 1.0 = completely different
-- A threshold of 0.6 means we only return results with similarity >= 0.4 (distance <= 0.6)

CREATE OR REPLACE FUNCTION public.search_products_enhanced(
  query_embedding vector(1152),
  p_model_id text DEFAULT 'google/siglip-so400m-patch14-384',
  p_limit integer DEFAULT 12,
  p_price_min numeric DEFAULT 0,
  p_price_max numeric DEFAULT 999999,
  p_categories text[] DEFAULT NULL,
  p_brands text[] DEFAULT NULL,
  p_colors text[] DEFAULT NULL,
  p_max_distance double precision DEFAULT 0.65  -- Only return results with distance <= 0.65 (similarity >= 0.35)
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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '30s'
AS $function$
BEGIN
  RETURN QUERY
  WITH vector_matches AS (
    -- First: use HNSW index to get top candidates (more than needed for filtering)
    -- Get more candidates to account for filtering out dissimilar results
    SELECT 
      pe.product_id,
      pe.embedding <=> query_embedding as distance,
      pe.image_id
    FROM product_embeddings pe
    WHERE pe.model_id = p_model_id
      AND (pe.embedding <=> query_embedding) <= p_max_distance  -- Filter by distance threshold early
    ORDER BY pe.embedding <=> query_embedding
    LIMIT LEAST(p_limit * 10, 200)  -- Get 10x candidates since we're filtering by distance too
  )
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
    vm.distance,
    vm.image_id
  FROM vector_matches vm
  JOIN products p ON p.id = vm.product_id
  WHERE p.price BETWEEN p_price_min AND p_price_max
    AND (p_categories IS NULL OR p.category = ANY(p_categories))
    AND (p_brands IS NULL OR p.brand = ANY(p_brands))
    AND (p_colors IS NULL OR p.color = ANY(p_colors))
  ORDER BY vm.distance
  LIMIT p_limit;
END;
$function$;

