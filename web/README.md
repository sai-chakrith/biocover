# SahyOpt dashboard

Next.js and Leaflet interface for the CSV-backed Python solver. No database setup is needed.

Start the solver from the repository root, then run `pnpm install --frozen-lockfile` and `pnpm dev` here. See the root README for the Windows launcher, dataset notes and validation commands.

The map is the main workflow: choose a model, locate sites, inspect species and download coordinates. All API routes forward to `SOLVER_URL` (default `http://127.0.0.1:8000`).
