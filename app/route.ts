import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

// Pre-read HTML at startup into memory for 0ms response time
let cachedHtml: string | null = null;

function getHtml(): string {
  return readFileSync(join(process.cwd(), 'public', 'app.html'), 'utf-8');
}

export async function GET() {
  try {
    const html = getHtml();
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
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
