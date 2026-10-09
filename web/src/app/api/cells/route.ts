import { solverResponse } from '@/lib/solver';

export async function GET() {
  return solverResponse('/cells');
}
