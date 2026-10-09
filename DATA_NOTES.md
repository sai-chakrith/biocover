# Data and result notes

The supplied GBIF file contains 14,505 Amphibia records. The cleaning rules retain 9,226 records and 220 species in 759 occupied 0.1° grid cells.

## Why the minimum changed from 57 to 56

The original pipeline used floating-point floor division (`coordinate // 0.1`). For some exact decimal boundaries this rounds into the previous cell: for example, `10.0 // 0.1` evaluates to 99 rather than 100. The corrected calculation floors the scaled coordinate with a small tolerance. This corrects the cell assignment of **41 retained records**. It does not change the retained records or species count, and there are still 759 occupied cells.

The original saved matrix had an optimum of 57, reproduced during review. Rebuilding the matrix with corrected grid assignments gives an optimum of **56**. CBC proves the corrected solution optimal; a separate feasibility test confirms that all species cannot be represented with 55 cells. The README is regenerated from the corrected matrix, not adjusted to preserve the earlier number.

## What the model means

- A selected cell represents at least one recorded occurrence of a species; it does not prove current occupancy, habitat viability or survival.
- K is a count of cells with equal cost, not a financial budget.
- The region is a coarse bounding box (8–21°N, 73–78°E), not a precise Western Ghats boundary polygon. A 0.1° grid is approximately 11 km north–south; east–west width varies with latitude.
- Missing coordinate uncertainty is retained: 3,896 cleaned records have no reported uncertainty. Reported uncertainty above 10 km is filtered out.
- The raw data includes years 1882–2026. GBIF issue flags and source identifiers are now retained in cleaned output for inspection, along with licenses and taxon keys where supplied. The original download DOI/query metadata was not supplied in this checkout.
- The existing IUCN weights are a supplied snapshot, not newly validated assessments. They include two EX labels (Pseudophilautus leucorhinus and Pseudophilautus variabilis). These historical records remain in the demonstration dataset; check them before interpreting recommendations as current conservation priorities. Failed future lookups are labeled NE, not LC.
- Sensitivity thresholds require multiple records **within a cell**, not multiple selected cells. Unsupported species are listed separately rather than counted as represented.
- Rank preferences reduce arbitrary choices but do not guarantee one unique network across solver builds. Compare species coverage and scores before interpreting changes in exact selected sites.

The solver reads files at startup. Restart it after regenerating data or weights. Its cache belongs to that loaded snapshot and is discarded on restart; responses include a data fingerprint.
