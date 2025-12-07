-- Add category filtering to search function
-- This migration adds category_eq parameter to search_products_filtered

-- Update search_products_filtered to support category filtering
create or replace function public.search_products_filtered(
  qvec        vector(1152),
  p_model_id  text,
  top_k       int default 50,
  price_min   numeric default null,
  price_max   numeric default null,
  brand_eq    text    default null,
  category_eq text    default null  -- NEW: category filter
)
returns table (
  id uuid,
  title text,
  brand text,
  price numeric,
  currency text,
  category text,
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
  with filtered_products as (
    select
      p.id,
      p.title,
      p.brand,
      p.price,
      p.currency,
      p.category,
      p.url,
      p.main_image_url
    from products p
    where (price_min is null or p.price >= price_min)
      and (price_max is null or p.price <= price_max)
      and (brand_eq is null or lower(p.brand) = lower(brand_eq))
      and (category_eq is null or lower(p.category) = lower(category_eq))  -- NEW: category filter
  ),
  vector_similarity as (
    select
      fp.id,
      fp.title,
      fp.brand,
      fp.price,
      fp.currency,
      fp.category,
      fp.url,
      fp.main_image_url,
      (pe.embedding <=> qvec) as cos_distance
    from filtered_products fp
    join product_embeddings pe on pe.product_id = fp.id
    where pe.model_id = p_model_id
      and pe.embedding is not null
    order by pe.embedding <=> qvec
    limit top_k
  )
  select
    id,
    title,
    brand,
    price,
    currency,
    category,
    url,
    main_image_url,
    1.0 - cos_distance as similarity,
    cos_distance
  from vector_similarity
  order by cos_distance asc;
$$;

