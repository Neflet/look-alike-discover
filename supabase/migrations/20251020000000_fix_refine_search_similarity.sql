-- Fix refine search to properly use vector similarity
-- Increase candidate pool and ensure similarity ordering is preserved
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
  -- Strategy: Get a much larger candidate pool from vector search first
  -- Then filter by price/brand, ensuring we still get top_k most similar results
  -- This ensures similarity is the primary ranking, with filters applied after
  with vector_candidates as (
    select
      pe.product_id as id,
      (pe.embedding <=> qvec) as cos_distance
    from product_embeddings pe
    where pe.model_id = p_model_id
    order by pe.embedding <=> qvec  -- Vector similarity search first
    limit top_k * 20  -- Much larger candidate pool to ensure we get enough after filtering
  ),
  filtered_candidates as (
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
    order by vc.cos_distance asc  -- Maintain similarity ordering
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
  order by cos_distance asc;  -- Final ordering by similarity
$$;

