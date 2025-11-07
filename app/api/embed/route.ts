import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const HF_URL = process.env.HF_EMBED_URL!;
const HF_TOKEN = process.env.HF_EMBED_TOKEN!;

export async function POST(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await req.json();
    const { image_url, image_base64, inputs } = body || {};

    // Accept either old fields or the new "inputs" contract
    const payload = inputs
      ? { inputs }
      : image_url
        ? { inputs: image_url }
        : image_base64
          ? { inputs: image_base64 }
          : null;

    if (!payload) {
      return NextResponse.json(
        { error: "Provide 'inputs' OR 'image_url' OR 'image_base64'" },
        { status: 400 }
      );
    }

    if (!HF_URL || !HF_TOKEN) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const r = await fetch(HF_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json();
    if (!r.ok) {
      return NextResponse.json({ error: data }, { status: r.status });
    }

    // Handler returns { embedding: [...] }
    if (!data.embedding) {
      return NextResponse.json({ error: 'No embedding field in response' }, { status: 500 });
    }

    return NextResponse.json({ embedding: data.embedding });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const r = await fetch(HF_URL, {
      method: 'HEAD',
      headers: { Authorization: `Bearer ${HF_TOKEN}` },
    });
    return NextResponse.json({ ok: r.ok }, { status: r.ok ? 200 : 503 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}

