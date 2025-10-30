Deno.serve(async (req) => {
  const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const ct = req.headers.get("content-type") ?? "";

    // Handle file upload - route to local encoder or backend
    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const f = form.get("file") || form.get("image");
      if (!(f instanceof File)) {
        return new Response(JSON.stringify({ error: "Expected FormData with 'file' or 'image' key" }),
          { status: 400, headers: { "Content-Type": "application/json", ...CORS } });
      }

      // Option 1: Try backend API (can access local encoder)
      const BACKEND_URL = Deno.env.get("BACKEND_URL") || "http://localhost:8000";
      
      try {
        const backendFormData = new FormData();
        backendFormData.append("file", f);
        
        const backendRes = await fetch(`${BACKEND_URL}/api/embed`, {
          method: "POST",
          body: backendFormData,
        });
        
        if (backendRes.ok) {
          const backendData = await backendRes.json();
          const response = {
            embedding: backendData.embedding || backendData.vector,
            dim: backendData.dim || backendData.embedding?.length || 1152,
            model: backendData.model || "google/siglip-so400m-patch14-384"
          };
          console.log(`[embed-image] using backend encoder, dim=${response.dim}`);
          return new Response(JSON.stringify(response), { 
            status: 200, 
            headers: { "Content-Type": "application/json", ...CORS } 
          });
        }
      } catch (backendErr) {
        console.log(`[embed-image] backend failed: ${backendErr}`);
      }
      
      // Option 2: Try HuggingFace endpoint
      const BASE = Deno.env.get("EMBED_BASE_URL") || Deno.env.get("HF_EMBED_ENDPOINT") || "";
      const HF_TOKEN = Deno.env.get("HF_API_TOKEN") || Deno.env.get("HF_TOKEN") || "";
      
      if (BASE) {
        // For HF, we need to convert file to base64 or upload to storage first
        // For now, return error suggesting to use backend
        return new Response(JSON.stringify({ 
          error: "File upload not directly supported. Please ensure backend API is running on localhost:8000 or configure backend endpoint."
        }), { 
          status: 500, 
          headers: { "Content-Type": "application/json", ...CORS } 
        });
      }
      
      return new Response(JSON.stringify({ 
        error: "No embedding service configured. Please set BACKEND_URL or EMBED_BASE_URL."
      }), { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...CORS } 
      });
    } 
    
    // Handle JSON input (imageUrl)
    else {
      const json = await req.json();
      const BASE = Deno.env.get("EMBED_BASE_URL") || Deno.env.get("HF_EMBED_ENDPOINT") || "";
      const HF_TOKEN = Deno.env.get("HF_API_TOKEN") || Deno.env.get("HF_TOKEN") || "";
      
      if (!BASE) {
        return new Response(JSON.stringify({ 
          error: "No embedding endpoint configured. Please set EMBED_BASE_URL or HF_EMBED_ENDPOINT."
        }), { 
          status: 500, 
          headers: { "Content-Type": "application/json", ...CORS } 
        });
      }
      
      const payload = (json && typeof json === "object" && "imageUrl" in json)
        ? { inputs: { image_url: json.imageUrl } }
        : json;

      const headers = new Headers();
      headers.set("Content-Type", "application/json");
      if (HF_TOKEN) headers.set("Authorization", `Bearer ${HF_TOKEN}`);

      const upstream = await fetch(BASE, { method: "POST", headers, body: JSON.stringify(payload) });
      const text = await upstream.text();
      console.log("[embed-image] upstream", upstream.status, text.slice(0, 160));

      if (!upstream.ok) {
        return new Response(JSON.stringify({ error: `Upstream ${upstream.status}`, detail: text }),
          { status: 500, headers: { "Content-Type": "application/json", ...CORS } });
      }
      
      const hfData = JSON.parse(text);
      const embedding = hfData.embedding || hfData[0]?.embedding || (Array.isArray(hfData) ? hfData : null);
      
      if (!embedding || !Array.isArray(embedding)) {
        throw new Error(`Invalid embedding format: ${JSON.stringify(hfData).slice(0, 200)}`);
      }
      
      const response = {
        embedding: embedding,
        dim: hfData.dim || embedding.length,
        model: hfData.model || "google/siglip-so400m-patch14-384"
      };
      
      console.log(`[embed-image] returning embedding dim=${response.dim}, model=${response.model}`);
      return new Response(JSON.stringify(response), { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...CORS } 
      });
    }
  } catch (e) {
    console.error("[embed-image] error", e);
    return new Response(JSON.stringify({ error: String(e), stack: e instanceof Error ? e.stack : undefined }),
      { status: 500, headers: { "Content-Type": "application/json", ...CORS } });
  }
});
