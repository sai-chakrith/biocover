import { redirect } from 'next/navigation';

export default async function MapPage({ searchParams }: {
  searchParams: Promise<{ model?: string; budget?: string; weighted?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const key of ['model', 'budget', 'weighted'] as const) {
    if (params[key] !== undefined) query.set(key, params[key]);
  }
  redirect(`/optimize${query.size ? `?${query}` : ''}`);
}
