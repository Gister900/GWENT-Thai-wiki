# กติกาโค้ด / Code rules

- **Stack:** Vite + React + TypeScript + Tailwind v4 (theme + utilities, no preflight). Styles in `src/styles/` (`tokens.css` = variables, `app.css` = everything else, phone ≤760px).
- **Two builds from one codebase:** `build:single` = one self-contained HTML file (images hot-linked from playgwent.com / gwent.one) · `build:web` = static site whose card images come from `public/art/` (switch: `__LOCAL_ART__` in `vite.config.ts`, URL order in `src/lib/art.ts`).
- **`src/data/` is generated** by `pipeline/build_data.py` (`npm run data`). Do not edit it by hand: change `data/` or `pipeline/` and rerun.
- **Card images for the web build:** `npm run art` (needs the raw data in `data/raw/`, not in this repo · downloads into `.cache/art/`, not committed) then `npm run art:web` (one webp size, 376px, into `public/art/l`, committed). A card has a local image exactly when it has an LQIP (`lq`); without one, or if it fails to load, the web build falls back to gwent.one. `npm run e2e:web` checks the web build served under a base path.
- **localStorage keys `gwent-*` must never be renamed or change format** (`src/lib/storage.ts`): people's decks, collections and stars live there. The e2e case "★ reads localStorage saved by the old page" must always pass.
- **Logic lives in `src/lib/` as pure functions** with unit tests next to it (`tests/unit/`). The e2e (`tests/e2e/`) checks behaviour, selecting elements by id / `data-*`, and fails on any console error.
- **Thai card text is AI-translated.** Card names, tags and keywords stay in English. Card pairings are computed from card text in `pipeline/pairs.py`, not guessed.
- **Fan content rules (CD PROJEKT RED):** keep the exact sentence "This is an unofficial fan work and is not approved/endorsed by CD PROJEKT RED." visible (footer + About dialog in `src/features/shell/About.tsx`), no ads, nothing commercial, nothing that suggests CD PROJEKT RED endorses the site.
