import 'dotenv/config';
import { Client } from 'pg';

async function main() {
  const url = process.env.DATABASE_URL!;
  if (!url) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const client = new Client({ connectionString: url });
  
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Test the vector similarity query that was timing out
    console.log('🔍 Testing vector similarity query...');
    
    const startTime = Date.now();
    
    const { rows } = await client.query(`
      WITH q AS (
        SELECT embedding AS qvec
        FROM product_embeddings
        WHERE model_id = 'google/siglip-so400m-patch14-384'
        LIMIT 1
      )
      SELECT 
        p.id, 
        p.title,
        p.price,
        p.main_image_url,
        (pe.embedding <=> q.qvec) as distance
      FROM product_embeddings pe
      JOIN products p ON p.id = pe.product_id
      CROSS JOIN q
      WHERE pe.model_id = 'google/siglip-so400m-patch14-384'
      ORDER BY pe.embedding <=> q.qvec
      LIMIT 10;
    `);
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ Query completed in ${duration}ms`);
    console.log(`📊 Found ${rows.length} results`);
    
    if (rows.length > 0) {
      console.log('\n🎯 Top results:');
      rows.forEach((row, i) => {
        console.log(`${i + 1}. ${row.title} (distance: ${row.distance?.toFixed(4)})`);
      });
    }

    // Check if the index is being used
    const explainResult = await client.query(`
      EXPLAIN (ANALYZE, BUFFERS) 
      WITH q AS (
        SELECT embedding AS qvec
        FROM product_embeddings
        WHERE model_id = 'google/siglip-so400m-patch14-384'
        LIMIT 1
      )
      SELECT 
        p.id, 
        p.title,
        (pe.embedding <=> q.qvec) as distance
      FROM product_embeddings pe
      JOIN products p ON p.id = pe.product_id
      CROSS JOIN q
      WHERE pe.model_id = 'google/siglip-so400m-patch14-384'
      ORDER BY pe.embedding <=> q.qvec
      LIMIT 5;
    `);
    
    console.log('\n📋 Query execution plan:');
    explainResult.rows.forEach(row => {
      console.log(row['QUERY PLAN']);
    });

  } catch (error) {
    console.error('❌ Error testing query:', error);
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






