-- Fix refine search to filter first, then apply vector similarity
-- Strategy: Filter products by price/brand first, then do vector similarity search within filtered set
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
    (1.0 - (cos_distance / 2.0)) as similarity,
    cos_distance
  from vector_similarity
  order by cos_distance asc;  -- Final ordering by similarity
$$;

-- Ensure we have an index on product_embeddings for fast lookups
create index if not exists idx_product_embeddings_model_product 
  on product_embeddings(model_id, product_id);

-- Ensure we have indexes on products for fast filtering
create index if not exists idx_products_price on products(price);
create index if not exists idx_products_brand on products(brand);

