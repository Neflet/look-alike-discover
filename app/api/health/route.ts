import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // force Node runtime

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function GET(req: NextRequest) {
  try {
    const hf = await fetch(process.env.HF_EMBED_ENDPOINT || "", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: {
          image_url:
            "https://raw.githubusercontent.com/huggingface/transformers/main/tests/fixtures/tests_samples/COCO/000000039769.png",
        },
      }),
    });

    let dim: number | null = null;
    let hfErr: string | null = null;
    try {
      const j = await hf.json();
      dim = Array.isArray(j?.embedding) ? j.embedding.length : j?.dim ?? null;
      hfErr = j?.error ?? null;
    } catch {
      hfErr = `hf status ${hf.status}`;
    }

    const { data, error } = await supabase.rpc("match_products_siglip", {
      query_embedding: Array(1152).fill(0).map((_, i) => (i === 0 ? 1 : 0)),
      match_count: 1,
      similarity_threshold: 0.0,
    });

    return new Response(
      JSON.stringify(
        {
          env: {
            supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            hfEndpoint: !!process.env.HF_EMBED_ENDPOINT,
            hfToken: !!process.env.HF_TOKEN,
          },
          hf: { ok: hf.ok, status: hf.status, dim, error: hfErr },
          db: { ok: !error, error: error?.message ?? null, sampleCount: data?.length ?? 0 },
        },
        null,
        2
      ),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
