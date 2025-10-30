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
  similarity double precision,
  cos_distance double precision
)
language sql
security definer
set search_path = public
set statement_timeout = '8000ms'
as $$
  with cand as (
    select
      pe.product_id as id,
      p.title,
      p.brand,
      p.price,
      pe.embedding,
      (pe.embedding <=> qvec) as cos_distance
    from product_embeddings pe
    join products p on p.id = pe.product_id
    where pe.model_id = p_model_id
      and (price_min is null or p.price >= price_min)
      and (price_max is null or p.price <= price_max)
      and (brand_eq is null or p.brand ilike brand_eq)
    order by pe.embedding <=> qvec
    limit top_k
  )
  select
    id, title, brand, price,
    (1.0 - (cos_distance / 2.0)) as similarity,
    cos_distance
  from cand
  order by cos_distance asc;
$$;

-- Helpful indexes for filters
create index if not exists idx_products_price on products(price);
create index if not exists idx_products_brand on products(brand);
