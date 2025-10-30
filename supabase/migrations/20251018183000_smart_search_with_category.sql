-- Smart search that prioritizes high-quality matches
-- Focuses on truly similar items (60%+ similarity) but allows 50%+ if needed

CREATE OR REPLACE FUNCTION public.search_products_enhanced(
  query_embedding vector(1152),
  p_model_id text DEFAULT 'google/siglip-so400m-patch14-384',
  p_limit integer DEFAULT 12,
  p_price_min numeric DEFAULT 0,
  p_price_max numeric DEFAULT 999999,
  p_categories text[] DEFAULT NULL,
  p_brands text[] DEFAULT NULL,
  p_colors text[] DEFAULT NULL,
  p_max_distance double precision DEFAULT 0.50
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
    -- Prioritize very similar items first (distance <= 0.40 = 60%+ similarity)
    -- Then allow slightly less similar if needed (up to 0.50 = 50%+ similarity)
    SELECT 
      pe.product_id,
      pe.embedding <=> query_embedding as distance,
      pe.image_id,
      CASE 
        WHEN (pe.embedding <=> query_embedding) <= 0.40 THEN 1  -- High quality priority
        ELSE 2  -- Medium quality
      END as quality_tier
    FROM product_embeddings pe
    WHERE pe.model_id = p_model_id
      AND (pe.embedding <=> query_embedding) <= p_max_distance
    ORDER BY 
      quality_tier,  -- High quality first
      pe.embedding <=> query_embedding  -- Then by distance
    LIMIT LEAST(p_limit * 20, 400)  -- Get good pool of candidates
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
  ORDER BY 
    vm.quality_tier,  -- High quality first
    vm.distance  -- Then by similarity
  LIMIT p_limit;
END;
$function$;
