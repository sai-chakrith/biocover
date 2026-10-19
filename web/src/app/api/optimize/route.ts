import { NextRequest, NextResponse } from 'next/server';
import { solverResponse } from '@/lib/solver';

export const maxDuration = 240;

export async function POST(request: NextRequest) {
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON request' }, { status: 400 }); }
  return solverResponse('/solve', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
