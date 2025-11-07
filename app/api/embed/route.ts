import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { inputs } = await req.json(); // inputs = base64 or URL

    const url = process.env.HF_ENDPOINT_URL!;
    const token = process.env.HF_API_TOKEN!;

    if (!url || !token) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs }),
    });

    if (!r.ok) {
      return NextResponse.json({ error: await r.text() }, { status: r.status });
    }

    const data = await r.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Embed proxy failed' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const r = await fetch(process.env.HF_ENDPOINT_URL!, {
      method: 'HEAD',
      headers: { Authorization: `Bearer ${process.env.HF_API_TOKEN!}` },
    });
    return NextResponse.json({ ok: r.ok }, { status: r.ok ? 200 : 503 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}

