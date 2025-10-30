-- build HNSW just for the SigLIP model
CREATE INDEX IF NOT EXISTS product_embeddings_embedding_hnsw_siglip
ON product_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 8, ef_construction = 32)
WHERE model_id = 'google/siglip-so400m-patch14-384';

ANALYZE product_embeddings;