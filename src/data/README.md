# src/data — generated, do not edit by hand

Every `.json` file here is written by `pipeline/build_data.py` (run `npm run data`).
Edit the inputs in `data/` (raw, i18n, tips) or the pipeline instead, then rebuild.

| file | content |
|---|---|
| cards.json | 1260 collectible cards (incl. leader abilities) with Thai text, pairs (`pr`), craft cost (`cc`) |
| tokens.json | 120 non-collectible tokens referenced by `rel` (keyed by card id) |
| keywords.json | keyword → `{en, th, tips}` |
| archetypes.json | deck archetypes per faction |
| pairLabels.json | labels for mechanic pair reasons |
| cardTips.json | per-card tips + sources |
| meta.json | `{ver, count, hasKwTh}` |
