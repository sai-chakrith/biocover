import { NextResponse } from 'next/server';

const SOLVER_URL = process.env.SOLVER_URL || 'http://127.0.0.1:8000';

export async function solverResponse(path: string, init?: RequestInit) {
  try {
    const response = await fetch(`${SOLVER_URL}${path}`, {
      ...init, cache: 'no-store', signal: AbortSignal.timeout(180_000),
    });
    const data = await response.json();
    if (!response.ok) {
      const detail = typeof data.detail === 'string' ? data.detail : 'Invalid optimization request';
      return NextResponse.json({ error: detail }, { status: response.status });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Solver unavailable. Start the Python solver and try again.' }, { status: 503 });
  }
}
