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
    const { model_id = 'siglip-vit-so400m-14-384', batch_size = 10 } = body;

    // Get all products that don't have embeddings for this model
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        title,
        brand,
        category,
        color,
        main_image_url,
        product_embeddings!left (
          id,
          model_id
        )
      `)
      .is('product_embeddings.model_id', null)
      .or(`product_embeddings.model_id.neq.${model_id},product_embeddings.id.is.null`)
      .limit(100);

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch products' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'All products already have embeddings for this model',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const hfToken = Deno.env.get('HUGGING_FACE_TOKEN');
    if (!hfToken) {
      return new Response(JSON.stringify({ error: 'Hugging Face token not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Map model IDs to Hugging Face model names
    const modelMapping: Record<string, string> = {
      'siglip-vit-so400m-14-384': 'google/siglip-so400m-patch14-384',
      'eva02-clip-vit-g-14': 'BAAI/EVA02-CLIP-L-14-336',
      'clip-vit-b-32': 'openai/clip-vit-base-patch32'
    };

    const hfModelName = modelMapping[model_id] || 'google/siglip-so400m-patch14-384';
    const modelDimensions = model_id === 'siglip-vit-so400m-14-384' ? 1152 : 
                           model_id === 'eva02-clip-vit-g-14' ? 1024 : 512;

    let processedCount = 0;
    const errors: string[] = [];

    // Process products in batches
    for (let i = 0; i < products.length; i += batch_size) {
      const batch = products.slice(i, i + batch_size);
      
      for (const product of batch) {
        try {
          if (!product.main_image_url) {
            console.log(`Skipping product ${product.id} - no image URL`);
            continue;
          }

          // Fetch the image
          const imageResponse = await fetch(product.main_image_url);
          if (!imageResponse.ok) {
            console.error(`Failed to fetch image for product ${product.id}`);
            continue;
          }

          const imageBuffer = await imageResponse.arrayBuffer();
          const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

          // Generate embedding using Hugging Face
          const hfResponse = await fetch(
            `https://api-inference.huggingface.co/models/${hfModelName}`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${hfToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                inputs: base64Image,
                options: { wait_for_model: true }
              }),
            }
          );

          if (!hfResponse.ok) {
            const errorText = await hfResponse.text();
            console.error(`HF API error for product ${product.id}:`, errorText);
            errors.push(`Product ${product.id}: ${errorText}`);
            continue;
          }

          const embedding = await hfResponse.json();

          // Store embedding in Supabase
          const { error: insertError } = await supabase
            .from('product_embeddings')
            .insert({
              product_id: product.id,
              model_id: model_id,
              embedding: embedding,
              dimensions: modelDimensions,
              image_id: 'main'
            });

          if (insertError) {
            console.error(`Error inserting embedding for product ${product.id}:`, insertError);
            errors.push(`Product ${product.id}: ${insertError.message}`);
          } else {
            processedCount++;
            console.log(`Processed product ${product.id} (${processedCount}/${products.length})`);
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`Error processing product ${product.id}:`, error);
          errors.push(`Product ${product.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    return new Response(JSON.stringify({ 
      message: 'Model retraining completed',
      processed: processedCount,
      total: products.length,
      errors: errors.slice(0, 10) // Limit error list
    }), {
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