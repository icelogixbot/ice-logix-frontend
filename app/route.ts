import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

// Pre-read HTML at startup into memory for 0ms response time
let cachedHtml: string | null = null;

function getHtml(): string {
  if (!cachedHtml) {
    cachedHtml = readFileSync(join(process.cwd(), 'public', 'app.html'), 'utf-8');
  }
  return cachedHtml;
}

export async function GET() {
  try {
    const html = getHtml();
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (e) {
    return new NextResponse('<h1>ICE LOGIX loading...</h1>', {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}
