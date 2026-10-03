import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const html = readFileSync(join(process.cwd(), 'public', 'app.html'), 'utf-8');
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (e) {
    return new NextResponse('<h1>ICE LOGIX loading...</h1>', {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}
