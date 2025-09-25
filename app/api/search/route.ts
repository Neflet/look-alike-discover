import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function l2(vec: number[]) {
  const s = Math.sqrt(vec.reduce((a, b) => a + b * b, 0)) || 1;
  return vec.map(v => v / s);
}

export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get("content-type") || "";
    let imageUrl: string | null = null;
    let bytes: ArrayBuffer | null = null;

    if (ct.startsWith("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      imageUrl = (form.get("url") as string) || null;
      if (file) bytes = await file.arrayBuffer();
    } else {
      const body = await req.json().catch(() => ({}));
      imageUrl = body.url ?? null;
    }

    if (!imageUrl && !bytes) {
      return new Response(JSON.stringify({ error: "Provide file or url" }), { status: 400 });
    }

    // If only bytes were sent, stash to Supabase Storage to get a temporary URL
    if (!imageUrl && bytes) {
      const uploadPath = `queries/${Date.now()}.jpg`;
      const { data, error } = await supabase.storage.from("uploads").upload(
        uploadPath,
        new Uint8Array(bytes),
        { contentType: "image/jpeg" }
      );
      if (error) throw error;
      const signed = await supabase.storage.from("uploads").createSignedUrl(data.path, 120);
      imageUrl = signed.data!.signedUrl;
    }

    // Call Hugging Face endpoint (custom handler expects {"inputs":{"image_url": ...}})
    const hfRes = await fetch(process.env.HF_EMBED_ENDPOINT!, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: { image_url: imageUrl } }),
      cache: "no-store"
    });

    if (!hfRes.ok) {
      const txt = await hfRes.text();
      throw new Error(`HF ${hfRes.status}: ${txt}`);
    }
    const payload = await hfRes.json();
    if (payload.error) throw new Error(payload.error);

    const embedding: number[] = payload.embedding;
    const dim = payload.dim ?? (Array.isArray(embedding) ? embedding.length : 0);
    if (!Array.isArray(embedding) || dim !== 1152) {
      throw new Error(`Expected 1152-d SigLIP vector, got ${dim}`);
    }
    const vec = l2(embedding);

    // KNN via RPC (uses products.embedding_1152)
    const { data: matches, error: dbErr } = await supabase.rpc("match_products_siglip", {
      query_embedding: vec,
      match_count: 24,
      similarity_threshold: 0.0
    });
    if (dbErr) throw dbErr;

    return new Response(JSON.stringify({ matches }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "Search failed" }), { status: 500 });
  }
}
