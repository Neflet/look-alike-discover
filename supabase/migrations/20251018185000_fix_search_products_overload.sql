-- Fix search_products function overload resolution
-- PostgreSQL is confused between vector and vector(1152) - make it explicit

-- First, drop the old ambiguous function if it exists
DROP FUNCTION IF EXISTS public.search_products(vector(1152), text, int);

-- Create with explicit type casting to avoid ambiguity
-- Use a different approach: create a wrapper that explicitly casts
CREATE OR REPLACE FUNCTION public.search_products_siglip(
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
    1.0 - (pe.embedding <=> qvec) as similarity,
    (pe.embedding <=> qvec) as cos_distance
  FROM product_embeddings pe
  JOIN products p ON p.id = pe.product_id
  WHERE pe.model_id = p_model_id
  ORDER BY pe.embedding <=> qvec
  LIMIT top_k;
$function$;

-- Also try adding a version with explicit vector casting
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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Explicitly cast and call the core logic
  RETURN QUERY
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
    1.0 - (pe.embedding <=> qvec::vector(1152)) as similarity,
    (pe.embedding <=> qvec::vector(1152)) as cos_distance
  FROM product_embeddings pe
  JOIN products p ON p.id = pe.product_id
  WHERE pe.model_id = p_model_id
    AND pe.embedding IS NOT NULL
  ORDER BY pe.embedding <=> qvec::vector(1152)
  LIMIT top_k;
END;
$function$;

