export interface CellDetail {
  cellId: string;
  cellLat: number;
  cellLon: number;
  centroidLat: number;
  centroidLon: number;
  speciesCount: number;
  species: { name: string; iucnCategory: string }[];
}
export interface OptResult {
  model: string;
  status: string;
  totalSelected: number;
  coveragePercent: number;
  solveTimeMs: number;
  selectedCells: string[];
  coveredSpecies: string[];
  uncoveredSpecies: string[];
  cellDetails: CellDetail[];
  weightedScore?: number;
  weightedCoveragePercent?: number;
  dataVersion: string;
}
export interface CurvePoint {
  budget: number;
  coveragePercent: number;
  weightedCoveragePercent: number;
}
