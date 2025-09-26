-- Cache table for embeddings
CREATE TABLE IF NOT EXISTS query_cache (
  image_hash TEXT PRIMARY KEY,
  embedding VECTOR(1152) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);

-- Enable RLS (Row Level Security) if needed
-- ALTER TABLE query_cache ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL ON query_cache TO authenticated;
-- GRANT ALL ON analytics_events TO authenticated;
-- GRANT ALL ON query_cache TO service_role;
-- GRANT ALL ON analytics_events TO service_role;
