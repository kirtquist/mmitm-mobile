# Future / Deferred Scope

Items to revisit when expanding the app.

## Explore / Catalog from OSM

Derive catalog types from the OSM explore API instead of the fixed list. Admin UI to curate which types are available.

- Requires bbox source: stored map region, fixed default, or "Load types from map area" (user opens map first, then Catalog fetches from that region).
- Option C (load from map) may be better UX if users want to curate types for a specific area.

## Auth and Admin Role

- Add authentication.
- Gate Catalog menu for admins only.
- When auth exists, Catalog screen can add an auth guard.

## Bbox Options (for Explore/Catalog)

- **A. Stored region:** Use last viewed map region from AsyncStorage (current plan).
- **B. Default region:** Fixed bbox (e.g. continental US or local area).
- **C. Load from map:** "Load types from area" button – user views map first, then Catalog fetches from that region.
