-- Note: profiles table already exists, we'll use that
-- This migration adds closet functionality that references products table

-- Create user_closet table (saved items)
CREATE TABLE IF NOT EXISTS public.user_closet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS
ALTER TABLE public.user_closet ENABLE ROW LEVEL SECURITY;

-- Users can view their own closet items
CREATE POLICY "Users can view own closet"
ON public.user_closet FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own closet items
CREATE POLICY "Users can insert own closet"
ON public.user_closet FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own closet items
CREATE POLICY "Users can delete own closet"
ON public.user_closet FOR DELETE
USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_closet_user_id ON public.user_closet(user_id);
CREATE INDEX IF NOT EXISTS idx_user_closet_product_id ON public.user_closet(product_id);
CREATE INDEX IF NOT EXISTS idx_user_closet_created_at ON public.user_closet(created_at DESC);

-- Update handle_new_user function to use existing profiles table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle closet item (save/unsave)
CREATE OR REPLACE FUNCTION public.toggle_closet_item(
  p_user_id UUID,
  p_product_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_exists BOOLEAN;
  v_action TEXT;
BEGIN
  -- Check if item exists
  SELECT EXISTS(
    SELECT 1 FROM public.user_closet 
    WHERE user_id = p_user_id AND product_id = p_product_id
  ) INTO v_exists;

  IF v_exists THEN
    -- Remove from closet
    DELETE FROM public.user_closet 
    WHERE user_id = p_user_id AND product_id = p_product_id;
    v_action := 'removed';
  ELSE
    -- Add to closet
    INSERT INTO public.user_closet (user_id, product_id)
    VALUES (p_user_id, p_product_id)
    ON CONFLICT (user_id, product_id) DO NOTHING;
    v_action := 'added';
  END IF;

  RETURN jsonb_build_object(
    'action', v_action,
    'is_saved', NOT v_exists
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's closet items
CREATE OR REPLACE FUNCTION public.get_user_closet(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  product_id UUID,
  title TEXT,
  brand TEXT,
  price NUMERIC,
  url TEXT,
  main_image_url TEXT,
  saved_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    uc.id,
    p.id as product_id,
    p.title,
    p.brand,
    p.price,
    p.url,
    p.main_image_url,
    uc.created_at as saved_at
  FROM public.user_closet uc
  JOIN public.products p ON p.id = uc.product_id
  WHERE uc.user_id = p_user_id
  ORDER BY uc.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if product is in user's closet
CREATE OR REPLACE FUNCTION public.is_product_saved(
  p_user_id UUID,
  p_product_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.user_closet 
    WHERE user_id = p_user_id AND product_id = p_product_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

