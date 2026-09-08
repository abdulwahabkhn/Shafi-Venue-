# Client inventory catalogue

Transcribed from the supplied 3 September handwritten crockery, hall-material and expense sheets, supplemented by the user's typed daily-expense list (Cobra spray, diesel, dustbin, seeds, spray and khaad). Staff titles, hired labour, fan rental, taxes, court costs and general expense headings are not owned stock and are excluded.

The 56 names are in `shared/inventory-catalog.json`: Crockery 22, Hall items 14, Cleaning 9, Maintenance 4, Decoration 4, Agriculture 3. Other remains available for new items; older Furniture, Dining and Electrical categories remain compatible.

Ambiguous handwriting is retained with confirmation notes: Platter bowl, serving/busing trays, buffet inner, glass shells, Zink sofa, CNC chair and Tipai dimensions. Fork and knife are grouped as on the original sheet. Units are unspecified by the client; imported entries use neutral “units”, not an assumed box size, set size or measurement.

No quantities are invented. Imported entries have a null opening quantity and show “Count not set”. GM uses “Set opening count” once (including zero), then normal stock movements. Existing items/history are preserved and the import skips existing matching names, including archived records. It uses deterministic IDs for safe reruns. No expenses or payments are created by this import.

Run `scripts/import-inventory-catalog.mjs` with INVENTORY_ORIGIN, INVENTORY_USERNAME and INVENTORY_PASSWORD in the process environment. Default is dry-run; `--apply` explicitly imports. Never commit credentials. Existing stock categories/counts are not overwritten.

Validation: production build and 59 isolated workflow checks passed, including category validation, unknown vs zero counts, idempotent opening counts and permission checks.
