# SahyOpt — Western Ghats amphibian site selection

SahyOpt locates grid cells that represent amphibian species recorded in GBIF. It is a simple Operations Research project: clean occurrences, solve a coverage model, and inspect the chosen locations on a map.

## Start on Windows

Double-click **run_project.bat**. On the first run it installs Python and web dependencies; internet access is needed. It starts two local services and checks them before reporting success. Open **http://127.0.0.1:3000/map**.

Prerequisites: Python 3.12+ (or uv) and Node.js 20.9+ with npm or pnpm. PostgreSQL is not required. The launcher also recognizes the bundled Codex runtimes on this computer. Errors are recorded in `logs/`.

On the map:

1. Choose Set Covering to represent every species with the fewest cells.
2. Or choose MCLP, set the maximum number of cells, and optionally enable IUCN weights.
3. Click Locate sites. Green cells are selected; click them for species and coordinates.
4. Download the selected site coordinates as CSV.

The Overview shows data counts. Optimize lists coverage and unrepresented species. Sensitivity compares record thresholds and equal/IUCN weighting using live results.

## Manual setup

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r solver/requirements.txt
.venv\Scripts\python solver/server.py
```

In a second terminal:

```powershell
cd web
pnpm install --frozen-lockfile
pnpm dev
```

`npm install` and `npm run dev` also work if pnpm is unavailable. The optional `web/.env.local` setting is `SOLVER_URL=http://127.0.0.1:8000`.

## Models

Let x_i select a cell, a_ij indicate an occurrence of species j in cell i, and y_j indicate representation.

- **SCLP:** minimize sum(x_i), subject to sum(a_ij x_i) >= 1 for every species.
- **MCLP:** maximize sum(w_j y_j), subject to y_j <= sum(a_ij x_i) and sum(x_i) <= K.
- Variables are binary. PuLP 3.3.0 uses the bundled CBC solver. Non-optimal solves are rejected instead of displayed as valid results. MCLP optimizes the coverage score first and applies a rank preference among optimal scores.
- Supplied weights: CR=5, EN=4, VU=3, NT=2, LC/DD/unknown=1; the supplied snapshot also has EX=6. These are a simple project scoring choice, not monetary values.

The corrected data has **759 cells, 220 species and 9,226 records**. Its full-coverage optimum is **56 cells**. The original 57 changed after correcting 41 cell-boundary assignments. See [DATA_NOTES.md](DATA_NOTES.md) for the exact reason and assumptions.

## Rebuild and check

The supplied checkout includes the raw `occurrence.txt`. The generated CSVs are tracked so the app works without downloading data again.

```powershell
.venv\Scripts\python clean_and_grid.py
.venv\Scripts\python generate_results_summary.py
.venv\Scripts\python -m pytest solver -v
cd web
pnpm lint
pnpm typecheck
pnpm build
```

`solver/fetch_iucn_weights.py` optionally refreshes weights; a failed lookup is NE. Restart the solver after changing data or weights. Its in-memory cache is tied to the loaded snapshot, and all responses include the dataset fingerprint.

The project locates recorded-species representation sites. It does not claim to establish current occupancy or real-world conservation outcomes. Keep the historical-data assumptions in the presentation.

## 📊 Results Summary

1. **Minimum Reserve Network (Set Covering)**:
   - Exactly **56 grid cells** are required to achieve 100% representation (covering all 220 amphibian species at least once).

2. **Coverage vs. Budget Curve (MCLP)**:
   - Budget = 1 cell $\rightarrow$ 19.1% species coverage (42 species)
   - Budget = 10 cells $\rightarrow$ 65.5% species coverage (144 species)
   - Budget = 20 cells $\rightarrow$ 80.5% species coverage (177 species)
   - Budget = 40 cells $\rightarrow$ 92.7% species coverage (204 species)
   - Budget = 55 cells $\rightarrow$ 99.5% species coverage (219 species)
   - Budget = 56 cells $\rightarrow$ 100.0% species coverage (220 species)

3. **Equal-Weighted vs. IUCN-Weighted Tradeoff**:
   - At a budget of 20 reserves, incorporating IUCN Red List weights ($w_j$) changes **6 out of 20 selected cells (30.0% network spatial shift)**.
   - **Equal-weighted model**: achieves 80.5% coverage (177 species).
   - **IUCN-weighted model**: achieves 77.3% coverage (170 species).
   - IUCN-weighted score: 401; equal solution evaluated with the same weights: 386.
   - Rank-based preferences can still tie; exact selected cells may differ between solver builds.
