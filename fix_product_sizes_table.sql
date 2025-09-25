-- Fix product_sizes table foreign key constraint
-- Drop existing table if it exists
DROP TABLE IF EXISTS product_sizes;

-- Create product_sizes table with correct UUID foreign key
CREATE TABLE product_sizes (
  id SERIAL PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  size_label TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX idx_product_sizes_product_id ON product_sizes(product_id);

-- Verify the table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'product_sizes'
ORDER BY ordinal_position; 