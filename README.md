# BioCover

BioCover is an Operations Research project that selects conservation sites for amphibians in the Western Ghats.

The idea is straightforward: when only a limited number of locations can be protected, which ones should we choose to represent the most species?

## What the project does

BioCover uses GBIF occurrence records to identify which amphibian species have been recorded in each grid cell. It then solves two optimization models:

- **Set Covering:** Find the smallest number of cells needed to represent every species at least once.
- **Maximum Coverage (MCLP):** Represent as many species as possible within a budget of K cells. Optional IUCN weighting prioritizes threatened species.

The dashboard includes an interactive map, species lists with IUCN labels, site explanations, sensitivity analysis, and CSV downloads.

## Data and results

The cleaned dataset contains:

- 9,226 occurrence records
- 220 amphibian species
- 759 occupied grid cells

Cells measure 0.1° in latitude and longitude—approximately 11 km north to south.

The current Set Covering solution requires **56 cells** to represent all 220 species.

| Cell budget | Species represented | Coverage |
| --- | --- | --- |
| 10 | 144 | 65.5% |
| 20 | 177 | 80.5% |
| 40 | 204 | 92.7% |
| 56 | 220 | 100% |

At a budget of 20 cells, IUCN weighting represents 170 species instead of 177, but achieves a higher threat-weighted score: 401 compared with 386 for the equal-weight solution.

Earlier results reported 57 cells for full coverage. Fixing the assignment of records at grid boundaries reduced the optimum to 56. See [DATA_NOTES.md](DATA_NOTES.md) for the details.

## Running locally

Requirements:

- Python 3.12+
- Node.js 20.9+
- npm or pnpm

On Windows, double-click `run_project.bat`. The launcher installs missing dependencies and starts both services. The first run needs an internet connection.

Open http://127.0.0.1:3000/optimize when startup finishes.

To start the services manually, run this from the repository root:

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r solver/requirements.txt
.venv\Scripts\python solver/server.py
```

In another terminal:

```powershell
cd web
pnpm install --frozen-lockfile
pnpm dev
```

The frontend connects to the solver at `http://127.0.0.1:8000`. To use a different backend address, set `SOLVER_URL` in `web/.env.local`.

No database is required.

## Using BioCover

Open **Optimize**, choose a model, and click **Locate sites**. For MCLP, choose a cell budget and optionally enable IUCN weighting.

Selected cells appear in orange. Click a selected cell and choose **Why this site?** to see:

- The species represented by that cell
- Their saved IUCN categories
- Threatened species present
- Species represented only by that cell within the selected network
- The loss in coverage if the cell were removed while the other selections stayed fixed

The Dashboard provides a dataset overview and an IUCN label index. Sensitivity compares record thresholds, equal and IUCN weighting, and greedy selection against exact Set Covering.

## Built with

- **Frontend:** Next.js, React, Leaflet and Recharts
- **Backend:** FastAPI
- **Optimization:** PuLP and CBC
- **Data processing:** pandas

## Deployment

The frontend can run on Vercel, with the Python solver hosted on Render or Railway.

For the backend, use the repository root and the included `Dockerfile`. The solver needs the CSV files stored alongside the `solver/` directory. Use `/health` as the healthcheck endpoint.

For Vercel:

- Set the root directory to `web`.
- Choose the Next.js framework.
- Set `SOLVER_URL` to the backend’s HTTPS base address.
- Set `ENABLE_EXPERIMENTAL_COREPACK=1` to use the pinned pnpm version.

The Dockerfile uses the hosting platform’s `PORT` environment variable.

## Checks

From the repository root:

```powershell
.venv\Scripts\python -m pytest solver -v
```

From `web/`:

```powershell
pnpm lint
pnpm typecheck
pnpm build
```

Restart the solver after changing the data or weights so it reloads the files and clears its cached results.

## Assumptions and limitations

This project measures representation of recorded occurrences. It does not establish current occupancy, habitat quality, land availability or the actual conservation benefit of protecting a site.

K counts equally priced cells, rather than money. IUCN weights are project scoring choices, not official numerical scores.

Some records and IUCN labels are historical, including two species labelled Extinct in the supplied snapshot. The geographic filter is a bounding box rather than a precise Western Ghats boundary.

“Unique within the selected network” does not mean a species occurs nowhere else.

BioCover is a subject project demonstrating how Operations Research can support conservation site selection. The data assumptions are documented in [DATA_NOTES.md](DATA_NOTES.md).
