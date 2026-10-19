import { solverResponse } from '@/lib/solver';

export const maxDuration = 240;

export async function GET() {
  return solverResponse('/sensitivity');
}
