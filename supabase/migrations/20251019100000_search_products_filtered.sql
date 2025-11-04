-- SQL: filtered vector search with optional price + brand
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
  -- Optimize: do vector search first on larger candidate pool, then filter
  -- This ensures we get enough results even after filtering
  with ranked as (
    select
      pe.product_id as id,
      (pe.embedding <=> qvec) as cos_distance
    from product_embeddings pe
    where pe.model_id = p_model_id
    order by pe.embedding <=> qvec
    limit top_k * 5  -- Get larger candidate pool to account for filtering
  )
  select
    p.id,
    p.title,
    p.brand,
    p.price,
    p.url,
    p.main_image_url,
    (1.0 - (r.cos_distance / 2.0)) as similarity,
    r.cos_distance
  from ranked r
  join products p on p.id = r.id
  where (price_min is null or p.price >= price_min)
    and (price_max is null or p.price <= price_max)
    and (brand_eq is null or lower(p.brand) = lower(brand_eq))
  order by r.cos_distance asc
  limit top_k;
$$;

-- Helpful indexes for filters
create index if not exists idx_products_price on products(price);
create index if not exists idx_products_brand on products(brand);

-- Function to get distinct brands (for dropdown)
create or replace function public.get_brands()
returns table (brand text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct brand
  from products
  where brand is not null
  order by brand asc;
$$;
