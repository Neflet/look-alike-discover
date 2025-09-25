import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    const body = await req.json();
    const { embedding, filters = {}, limit = 50 } = body;

    if (!embedding || !Array.isArray(embedding)) {
      return new Response(JSON.stringify({ error: 'Invalid embedding provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Search products from database
    const { data: searchResults, error: searchError } = await supabase
      .from('products')
      .select('*')
      .limit(limit);

    if (searchError) {
      console.error('Database search error:', searchError);
      return new Response(JSON.stringify({ error: 'Database search failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Transform results to match expected format
    const results = searchResults?.map((row: any) => ({
      product_id: row.product_id,
      title: row.title,
      name: row.title,
      brand: row.brand,
      price: row.price,
      currency: row.currency,
      category: row.category,
      color: row.color,
      url: row.url,
      buy_link: row.url,
      main_image_url: row.main_image_url,
      image_url: row.main_image_url,
      distance: row.distance,
      similarity_score: 1 - row.distance // Convert distance to similarity
    })) || [];

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});