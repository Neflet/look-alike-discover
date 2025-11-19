-- Add similarity threshold support: increase candidate pool and fix similarity calculation
-- This allows filtering by similarity threshold in TypeScript after getting a larger candidate set

-- Update search_products_siglip to return larger candidate pool
create or replace function public.search_products_siglip(
  qvec vector(1152),
  p_model_id text DEFAULT 'google/siglip-so400m-patch14-384',
  top_k int DEFAULT 50  -- Increased from 24 to get larger candidate pool for filtering
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
    1.0 - (pe.embedding <=> qvec) as similarity,  -- similarity: 1.0 = identical, 0.0 = completely different
    (pe.embedding <=> qvec) as cos_distance       -- distance: 0.0 = identical, 1.0 = completely different
  FROM product_embeddings pe
  JOIN products p ON p.id = pe.product_id
  WHERE pe.model_id = p_model_id
    AND pe.embedding IS NOT NULL
  ORDER BY pe.embedding <=> qvec  -- Order by distance (most similar first)
  LIMIT top_k;
$function$;

-- Update search_products_filtered to return larger candidate pool and fix similarity calculation
create or replace function public.search_products_filtered(
  qvec        vector(1152),
  p_model_id  text,
  top_k       int default 50,  -- Increased from 12 to get larger candidate pool for filtering
  price_min   numeric default null,
  price_max   numeric default null,
  brand_eq    text    default null
)
returns table (
  id uuid,
  title text,
  brand text,
  price numeric,
  url text,
  main_image_url text,
  similarity double precision,
  cos_distance double precision
)
language sql
security definer
set search_path = public
set statement_timeout = '20s'
as $$
  -- Strategy: Filter first, then apply vector similarity within filtered set
  -- This ensures users get results that match their filters AND are most similar
  with filtered_products as (
    select
      p.id,
      p.title,
      p.brand,
      p.price,
      p.url,
      p.main_image_url
    from products p
    where (price_min is null or p.price >= price_min)
      and (price_max is null or p.price <= price_max)
      and (brand_eq is null or lower(p.brand) = lower(brand_eq))
  ),
  vector_similarity as (
    select
      fp.id,
      fp.title,
      fp.brand,
      fp.price,
      fp.url,
      fp.main_image_url,
      (pe.embedding <=> qvec) as cos_distance
    from filtered_products fp
    join product_embeddings pe on pe.product_id = fp.id
    where pe.model_id = p_model_id
      and pe.embedding is not null
    order by pe.embedding <=> qvec  -- Vector similarity within filtered set
    limit top_k
  )
  select
    id,
    title,
    brand,
    price,
    url,
    main_image_url,
    1.0 - cos_distance as similarity,  -- Fixed: use same formula as search_products_siglip (1.0 - distance)
    cos_distance
  from vector_similarity
  order by cos_distance asc;  -- Final ordering by similarity (most similar first)
$$;

