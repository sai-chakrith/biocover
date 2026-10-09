# Verification

The final checks used Python 3.12.14, PuLP 3.3.0 and Next.js 16.3.2.

- `python -m pytest solver -v -p no:cacheprovider`: **18 passed**, one dependency deprecation warning. Covers exact small-model solutions, the corrected 56-cell dataset optimum, infeasibility at 55 cells, coordinate-boundary gridding and retained provenance, invalid budgets, failed/time-limited solves, repeated API response parity, and sensitivity exclusions.
- `pnpm build`: passed, including compilation and TypeScript validation.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `git diff --check`: passed.
- Browser: all 759 cells loaded; full representation selected 56 cells; repeating selection worked; K=20 with IUCN weights selected 20 cells covering 170 species (77.3% raw, 82.2% weighted representation); sensitivity showed live supported/excluded counts and both coverage curves.
- Browser download: selected-site CSV contained 56 unique cell IDs and latitude, longitude and species-count columns.
- Basemap: switched from the Carto endpoint, which displayed an API-key-required tile, to working OpenStreetMap tiles with attribution.

The initial dependency installation timed out on large Next.js downloads. Increasing the transfer timeout completed it; the pnpm lockfile records the installed versions. API TestClient checks could not complete under the sandbox's thread restrictions; the same tests passed outside those restrictions. These are environment constraints, not silently skipped checks.

The original matrix's 57-cell result was reproduced before the coordinate-boundary correction. The corrected matrix has a proven optimum of 56; see DATA_NOTES.md. The saved IUCN categories were not refreshed or independently audited during this work.
