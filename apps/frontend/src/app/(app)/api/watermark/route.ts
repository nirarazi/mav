import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

/** Vercel Serverless / Node — sharp requires Node runtime (not Edge). */
export const runtime = 'nodejs';

/** Allow long-running image fetch + composite on preview/hobby tiers when needed. */
export const maxDuration = 60;

function escapeXml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Lambda-style watermark pipeline (Vercel Serverless Function).
 * GET — health / discovery for preview smoke tests.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'watermark-pipeline',
    runtime: 'nodejs',
    usage: {
      method: 'POST',
      body: { imageUrl: 'https://…', text: 'optional label (default: PREVIEW)' },
    },
  });
}

/**
 * POST JSON `{ imageUrl, text? }` → JPEG with bottom-right text overlay.
 */
export async function POST(req: NextRequest) {
  let body: { imageUrl?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Expected JSON body' }, { status: 400 });
  }

  const imageUrl = body.imageUrl;
  const text = body.text?.trim() || 'PREVIEW';

  if (!imageUrl || typeof imageUrl !== 'string') {
    return NextResponse.json(
      { error: 'imageUrl is required (string)' },
      { status: 400 }
    );
  }

  let src: Buffer;
  try {
    const res = await fetch(imageUrl, {
      redirect: 'follow',
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream fetch failed: ${res.status}` },
        { status: 422 }
      );
    }
    const ab = await res.arrayBuffer();
    src = Buffer.from(ab);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'fetch failed';
    return NextResponse.json({ error: message }, { status: 422 });
  }

  try {
    const meta = await sharp(src).metadata();
    const width = meta.width ?? 800;
    const height = meta.height ?? 600;
    const safe = escapeXml(text.slice(0, 200));
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <text x="${width - 24}" y="${height - 24}" font-family="system-ui,sans-serif" font-size="28" font-weight="600" fill="rgba(255,255,255,0.92)" stroke="rgba(0,0,0,0.45)" stroke-width="3" paint-order="stroke fill" text-anchor="end">${safe}</text>
</svg>`;

    const out = await sharp(src)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    return new NextResponse(out, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'processing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
