require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL environment variable is required');
    console.error('Add it to your .env.local file:');
    console.error('DATABASE_URL=postgresql://postgres:<PASSWORD>@<HOST>:5432/postgres');
    process.exit(1);
  }

  const client = new Client({ connectionString: url });
  
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // safer timeouts for long-running index builds
    await client.query(`SET statement_timeout = '15min';`);
    console.log('✅ Set statement timeout to 15 minutes');

    // 1) ensure pgvector is present (no-op if already installed)
    await client.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
    console.log('✅ pgvector extension ready');

    // 2) drop any old partial index for this model (optional)
    await client.query(`DROP INDEX IF EXISTS product_embeddings_embedding_hnsw_siglip;`);
    console.log('✅ Dropped old index if it existed');

    // 3) build a partial HNSW index CONCURRENTLY for the exact model_id we query
    const sql = `
      CREATE INDEX CONCURRENTLY product_embeddings_embedding_hnsw_siglip
      ON product_embeddings
      USING hnsw (embedding vector_cosine_ops)
      WHERE model_id = 'google/siglip-so400m-patch14-384'
      WITH (m = 8, ef_construction = 24);
    `;
    console.log('🔨 Building HNSW index… this can take a while (5-15 minutes).');
    console.log('   The index is being built CONCURRENTLY so your app stays online.');
    
    const startTime = Date.now();
    await client.query(sql);
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`✅ Index built successfully in ${duration} seconds`);

    // 4) analyze so planner knows about it
    await client.query(`ANALYZE product_embeddings;`);
    console.log('✅ Analyzed table for query planner');

    // 5) show indexes so we can confirm
    const { rows } = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'product_embeddings'
      ORDER BY indexname;
    `);
    console.log('\n📊 Current indexes on product_embeddings:');
    console.table(rows);

    // 6) show some stats about the index
    const { rows: stats } = await client.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes 
      WHERE tablename = 'product_embeddings' 
      AND indexname = 'product_embeddings_embedding_hnsw_siglip';
    `);
    
    if (stats.length > 0) {
      console.log('\n📈 Index statistics:');
      console.table(stats);
    }

  } catch (error) {
    console.error('❌ Error building index:', error);
    throw error;
  } finally {
    await client.end();
    console.log('✅ Database connection closed');
  }
}

main().catch((err) => {
  console.error('💥 Script failed:', err);
  process.exit(1);
});
