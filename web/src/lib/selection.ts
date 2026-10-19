export interface Selection {
  model: 'set_covering' | 'mclp';
  budget: number;
  weighted: boolean;
}
export type SelectionParams = { model?: string; budget?: string; weighted?: string };
export const LAST_SELECTION_KEY = 'biocover-last-selection';

export function parseSelection(params: SelectionParams): Selection | null {
  if (params.model !== 'set_covering' && params.model !== 'mclp') return null;
  const requested = Number(params.budget);
  return {
    model: params.model,
    budget: Number.isInteger(requested) && requested >= 1 && requested <= 100 ? requested : 20,
    weighted: params.model === 'mclp' && String(params.weighted) === 'true',
  };
}

export function selectionQuery(selection: Selection) {
  return new URLSearchParams({ model: selection.model, budget: String(selection.budget),
    weighted: String(selection.model === 'mclp' && selection.weighted) }).toString();
}
