import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30; // Increase timeout for large images

const HF_URL = process.env.HF_EMBED_URL;
const HF_TOKEN = process.env.HF_EMBED_TOKEN;

export async function POST(req: NextRequest) {
  try {
    if (!HF_URL || !HF_TOKEN) {
      console.error('Missing envs', { hasUrl: !!HF_URL, hasToken: !!HF_TOKEN });
      return NextResponse.json(
        { error: 'Server misconfigured: HF env vars missing' },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { inputs, image_url, image_base64 } = body as {
      inputs?: string;
      image_url?: string;
      image_base64?: string;
    };

    // Accept either old fields or the new "inputs" contract
    const payload = inputs
      ? { inputs }
      : image_url
        ? { inputs: image_url }
        : image_base64
          ? { inputs: image_base64 }
          : null;

    if (!payload) {
      console.error('Bad payload', body);
      return NextResponse.json(
        { error: "Provide 'inputs' OR 'image_url' OR 'image_base64'" },
        { status: 400 }
      );
    }

    const r = await fetch(HF_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
      console.error('HF error', r.status, data);
      return NextResponse.json({ error: data || 'HF error' }, { status: r.status });
    }

    if (!data.embedding) {
      console.error('No embedding in HF response', data);
      return NextResponse.json(
        { error: 'No embedding in HF response' },
        { status: 500 }
      );
    }

    return NextResponse.json({ embedding: data.embedding });
  } catch (e: any) {
    console.error('Embed route exception', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (!HF_URL || !HF_TOKEN) {
      return NextResponse.json({ ok: false }, { status: 503 });
    }
    const r = await fetch(HF_URL, {
      method: 'HEAD',
      headers: { Authorization: `Bearer ${HF_TOKEN}` },
    });
    return NextResponse.json({ ok: r.ok }, { status: r.ok ? 200 : 503 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}

