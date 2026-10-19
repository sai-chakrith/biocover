import OptimizeForm from '@/components/OptimizeForm';
import { parseSelection, type SelectionParams } from '@/lib/selection';

export default async function OptimizePage({ searchParams }: { searchParams: Promise<SelectionParams> }) {
  const selection = parseSelection(await searchParams) || { model: 'set_covering', budget: 20, weighted: false };
  return <OptimizeForm key={JSON.stringify(selection)} initialSelection={selection}/>;
}
