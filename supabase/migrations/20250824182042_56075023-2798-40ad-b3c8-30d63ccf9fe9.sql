-- Fix function search path security issues
CREATE OR REPLACE FUNCTION public.search_products_enhanced(
  query_embedding vector(1152),
  p_model_id text DEFAULT 'siglip-vit-so400m-14-384',
  p_limit integer DEFAULT 50,
  p_price_min numeric DEFAULT 0,
  p_price_max numeric DEFAULT 999999,
  p_categories text[] DEFAULT NULL,
  p_brands text[] DEFAULT NULL,
  p_colors text[] DEFAULT NULL
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
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
    (pe.embedding <=> query_embedding) as distance,
    pe.image_id
  FROM product_embeddings pe
  JOIN products p ON p.id = pe.product_id
  WHERE pe.model_id = p_model_id
    AND p.price BETWEEN p_price_min AND p_price_max
    AND (p_categories IS NULL OR p.category = ANY(p_categories))
    AND (p_brands IS NULL OR p.brand = ANY(p_brands))
    AND (p_colors IS NULL OR p.color = ANY(p_colors))
  ORDER BY pe.embedding <=> query_embedding
  LIMIT p_limit;
$function$;

-- Fix search_products function search path
CREATE OR REPLACE FUNCTION public.search_products(query_vec vector, pmin numeric DEFAULT 0, pmax numeric DEFAULT 999999, pcolor text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, title text, price numeric, color text, url text, main_image_url text, distance double precision)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public
AS $function$
  select p.id, p.title, p.price, p.color, p.url, p.main_image_url,
         (pv.image_emb <#> query_vec) as distance
  from product_vectors pv
  join products p on p.id = pv.product_id
  where p.price between pmin and pmax
    and (pcolor is null or lower(p.color) = lower(pcolor))
  order by pv.image_emb <#> query_vec asc
  limit 60;
$function$;

-- Fix track_analytics_event function search path
CREATE OR REPLACE FUNCTION public.track_analytics_event(p_user_id uuid, p_session_id text, p_event_type text, p_event_data jsonb, p_page_url text, p_user_agent text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.analytics_events (
    user_id,
    session_id,
    event_type,
    event_data,
    page_url,
    user_agent,
    ip_address
  ) VALUES (
    p_user_id,
    p_session_id,
    p_event_type,
    p_event_data,
    p_page_url,
    p_user_agent,
    inet_client_addr()
  );
END;
$function$;

-- Fix handle_new_user function search path
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name');
  RETURN NEW;
END;
$function$;

-- Fix update_updated_at_column function search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Check if product_sizes table has RLS enabled, and enable it if not
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'product_sizes' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;
        
        -- Add a public read policy for product_sizes
        CREATE POLICY "public read product_sizes" 
        ON public.product_sizes 
        FOR SELECT 
        USING (true);
    END IF;
END $$;