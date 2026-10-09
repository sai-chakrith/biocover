import MapExplorer from '@/components/MapExplorer';

export default async function MapPage({ searchParams }: {
  searchParams: Promise<{ model?: string; budget?: string; weighted?: string }>;
}) {
  const params = await searchParams;
  const model = params.model === 'mclp' ? 'mclp' : 'set_covering';
  const requested = Number(params.budget);
  const budget = Number.isInteger(requested) && requested >= 1 && requested <= 100 ? requested : 20;
  const weighted = params.weighted === 'true';
  return <MapExplorer key={`${model}-${budget}-${weighted}`} initialModel={model} initialBudget={budget} initialWeighted={weighted} />;
}
