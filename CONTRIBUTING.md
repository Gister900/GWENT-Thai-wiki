# กติกาโค้ด / Code rules

- **Stack:** Vite + React + TypeScript + Tailwind v4 (theme + utilities, no preflight). Styles in `src/styles/` (`tokens.css` = variables, `app.css` = everything else, phone ≤760px).
- **Two builds from one codebase:** `build:single` = one self-contained HTML file (images hot-linked from playgwent.com / gwent.one) · `build:web` = static site whose card images come from `public/art/` (switch: `__LOCAL_ART__` in `vite.config.ts`, URL order in `src/lib/art.ts`).
- **`src/data/` is generated** by `pipeline/build_data.py` (`npm run data`). Do not edit it by hand: change `data/` or `pipeline/` and rerun.
- **Card images for the web build:** `npm run art` (needs the raw data in `data/raw/`, not in this repo · downloads into `.cache/art/`, not committed) then `npm run art:web` (one webp size, 376px, into `public/art/l`, committed). A card has a local image exactly when it has an LQIP (`lq`); without one, or if it fails to load, the web build falls back to gwent.one. `npm run e2e:web` checks the web build served under a base path.
- **localStorage keys `gwent-*` must never be renamed or change format** (`src/lib/storage.ts`): people's decks, collections and stars live there. The e2e case "★ reads localStorage saved by the old page" must always pass.
- **Every change people can see needs an entry in `src/content/changelog.ts`** (newest first, Thai and English, written as what changed for the user). It feeds the "What's new" list on the Guide page and the dot on the menu. Also update the Guide text (`guide` in `src/i18n/ui.ts`) when a feature it describes changes. / ทุกการเปลี่ยนแปลงที่ผู้ใช้เห็น ต้องเพิ่มรายการใน `src/content/changelog.ts` (ไทยและอังกฤษ) และแก้หน้าวิธีใช้ถ้าพฤติกรรมที่อธิบายไว้เปลี่ยน
- **UI text lives in `src/i18n/ui.ts`** with Thai and English side by side (same keys, checked by `tests/unit/ui.test.ts`); English mode must show no Thai (`tests/e2e/lang.spec.ts` — add new pages/dialogs there).
- **Deck formats:** saved decks `gwent-decks` / `gwent-deck-active` (the old `gwent-deck` is moved in once and kept as a backup), export file `{type:"gwent-decks", version:1, decks:[{name, f, L, c}]}`, share links `#deck=<code>` (`src/lib/deckCode.ts`). Links already shared must keep working: change the code format only with a new version byte.
- **Logic lives in `src/lib/` as pure functions** with unit tests next to it (`tests/unit/`). The e2e (`tests/e2e/`) checks behaviour, selecting elements by id / `data-*`, and fails on any console error.
- **Thai card text, and the English tips and interface, are AI-translated.** Card names, tags and keywords stay in English. Card pairings are computed from card text in `pipeline/pairs.py`, not guessed.
- **Fan content rules (CD PROJEKT RED):** keep the exact sentence "This is an unofficial fan work and is not approved/endorsed by CD PROJEKT RED." visible (footer + About dialog in `src/features/shell/About.tsx`), no ads, nothing commercial, nothing that suggests CD PROJEKT RED endorses the site.

## วิธี build / Build
ต้องมี Node.js 22 ขึ้นไป

```
npm install
npm run build:web        # dist/ เว็บปกติ · ตั้ง base: BASE=/GWENT-Thai-wiki/ npm run build:web
npm run build:single     # dist-single/GWENT-Thai-wiki.html ไฟล์เดียว เปิดจาก file:// ได้ (รูปการ์ดดึงจากเน็ต)
npm run dev              # dev server http://localhost:5190
```

| คำสั่ง | ทำอะไร |
|---|---|
| `npm test` | unit test ของ `src/lib` (vitest) |
| `npm run e2e` | Playwright บนไฟล์ `dist-single/GWENT-Thai-wiki.html` (build ก่อน · ต้องมี chromium: `npx playwright install chromium`) |
| `npm run e2e:web` | build เว็บด้วย `BASE=/GWENT-Thai-wiki/` แล้ว serve `dist/` ใต้ path นั้นเหมือน GitHub Pages · เช็กว่ารูปการ์ดมาจาก `art/` ของเว็บเอง ไม่มี 404 และไม่ดึงรูปจาก playgwent/gwent.one (ยกเว้น token ที่ไม่มีไฟล์ในเว็บ) |
| `npm run data` | สร้าง `src/data/*.json` จาก `data/` ใหม่ (**ต้องมีไฟล์ข้อมูลดิบใน `data/raw/` ซึ่งไม่ได้รวมไว้ใน repo นี้** + Python 3 · ไฟล์ที่สร้างแล้ว commit ไว้ build ปกติไม่ต้องใช้) |
| `npm run art` / `npm run art:refresh` | เช็ก/ดาวน์โหลดรูปการ์ดลง `.cache/art/` (**ต้องมีไฟล์ข้อมูลดิบใน `data/raw/` ซึ่งไม่ได้รวมไว้ใน repo นี้** + venv `.venv` ที่ติดตั้ง Pillow) |
| `npm run art:web` | แปลงรูปใน `.cache/art/` (จาก `npm run art`) เป็น webp กว้าง 376px ขนาดเดียวใน `public/art/l/` (ต้องมี `.venv` ที่ติดตั้ง Pillow · รูปที่แปลงแล้ว commit ไว้ build ปกติไม่ต้องใช้) |

เว็บบน GitHub Pages build ด้วย `.github/workflows/pages.yml` ทุกครั้งที่ push เข้า `main` ใช้เฉพาะข้อมูลและรูปที่ commit ไว้ ไม่ดึงอะไรจากเว็บการ์ด
