import MapExplorer from '@/components/MapExplorer';
import { parseSelection, type SelectionParams } from '@/lib/selection';

export default async function MapPage({ searchParams }: {
  searchParams: Promise<SelectionParams>;
}) {
  const selection = parseSelection(await searchParams);
  return <MapExplorer key={JSON.stringify(selection)} initialSelection={selection} />;
}
