-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  brand TEXT,
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  category TEXT,
  color TEXT,
  url TEXT,
  main_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "public read products" 
ON public.products 
FOR SELECT 
USING (true);

-- Create index on brand for filtering
CREATE INDEX IF NOT EXISTS products_brand_idx ON public.products (brand);

-- Create index on category for filtering
CREATE INDEX IF NOT EXISTS products_category_idx ON public.products (category);

-- Create index on color for filtering
CREATE INDEX IF NOT EXISTS products_color_idx ON public.products (color);

-- Create index on price for filtering
CREATE INDEX IF NOT EXISTS products_price_idx ON public.products (price);

-- Insert some sample products for testing
INSERT INTO public.products (title, brand, price, currency, category, color, url, main_image_url) VALUES
('Classic White T-Shirt', 'Nike', 29.99, 'USD', 'Tops', 'White', 'https://nike.com/white-tshirt', 'https://example.com/nike-white-tshirt.jpg'),
('Black Hoodie', 'Adidas', 79.99, 'USD', 'Outerwear', 'Black', 'https://adidas.com/black-hoodie', 'https://example.com/adidas-black-hoodie.jpg'),
('Blue Jeans', 'Levi''s', 89.99, 'USD', 'Bottoms', 'Blue', 'https://levis.com/blue-jeans', 'https://example.com/levis-blue-jeans.jpg'),
('Red Sneakers', 'Nike', 129.99, 'USD', 'Footwear', 'Red', 'https://nike.com/red-sneakers', 'https://example.com/nike-red-sneakers.jpg'),
('Green Jacket', 'Carhartt', 149.99, 'USD', 'Outerwear', 'Green', 'https://carhartt.com/green-jacket', 'https://example.com/carhartt-green-jacket.jpg')
ON CONFLICT DO NOTHING;
