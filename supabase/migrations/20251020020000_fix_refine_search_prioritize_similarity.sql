-- Fix refine search to prioritize similarity while respecting filters
-- Strategy: Get top similar items first, then filter by parameters
-- This ensures we get the most similar results that also match filters
-- If filters are too restrictive, we still get the best matches from the filtered set
create or replace function public.search_products_filtered(
  qvec        vector(1152),
  p_model_id  text,
  top_k       int default 12,
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
  -- Strategy: Get top similar items first (larger candidate pool),
  -- then filter by parameters, ensuring we get the most similar results
  -- that also match the filters
  with vector_candidates as (
    -- Get a larger candidate pool from vector similarity search
    -- This ensures we have enough good matches even after filtering
    select
      pe.product_id as id,
      (pe.embedding <=> qvec) as cos_distance
    from product_embeddings pe
    where pe.model_id = p_model_id
      and pe.embedding is not null
    order by pe.embedding <=> qvec  -- Vector similarity search first (most similar first)
    limit top_k * 30  -- Large candidate pool to ensure we get enough after filtering
  ),
  filtered_candidates as (
    -- Filter the similar candidates by price/brand
    -- This ensures we get the most similar items that match filters
    select
      vc.id,
      vc.cos_distance,
      p.title,
      p.brand,
      p.price,
      p.url,
      p.main_image_url
    from vector_candidates vc
    join products p on p.id = vc.id
    where (price_min is null or p.price >= price_min)
      and (price_max is null or p.price <= price_max)
      and (brand_eq is null or lower(p.brand) = lower(brand_eq))
    order by vc.cos_distance asc  -- Maintain similarity ordering (most similar first)
    limit top_k
  )
  select
    id,
    title,
    brand,
    price,
    url,
    main_image_url,
    (1.0 - (cos_distance / 2.0)) as similarity,
    cos_distance
  from filtered_candidates
  order by cos_distance asc;  -- Final ordering by similarity (most similar first)
$$;

-- Ensure we have indexes for fast lookups
create index if not exists idx_product_embeddings_model_product 
  on product_embeddings(model_id, product_id);

-- Ensure we have indexes on products for fast filtering
create index if not exists idx_products_price on products(price);
create index if not exists idx_products_brand on products(brand);

