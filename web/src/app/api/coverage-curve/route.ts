import { NextRequest } from 'next/server';
import { solverResponse } from '@/lib/solver';

export const maxDuration = 240;

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const query = new URLSearchParams({ weighted: params.get('weighted') || 'false', max_budget: params.get('max_budget') || '60' });
  return solverResponse(`/coverage-curve?${query}`);
}
