// Which image URLs to try for a card, in order.
// Main source = playgwent.com (official CDPR site · ~0.07 s per image) preview `pi`: the card art itself (376×540),
// leader abilities are a framed card back (cropped with the .pgl class). gwent.one (fan site, ~1 s per image incl. its 404 page)
// is only the fallback, mostly for tokens (no `pi`); sizes the pipeline found missing there (`na`) are skipped.
// Web build (build:web, __LOCAL_ART__ = true): every image comes from the site itself (public/art/, made by
// pipeline/web_art.py from the same cached files, one size: 376 px wide). A local file exists exactly when the
// card has an LQIP (`lq`), because both are made from the same cached image. Cards with no local file, or whose local
// file fails to load, fall back to gwent.one at the sizes it has (`na`), like build:single. build:single keeps the remote urls.

export const GO = 'https://gwent.one/img/assets/'
export const PG = 'https://www.playgwent.com/uploads/media/assets_preview/'
export type Q = 'low' | 'medium'
/** `na` bits: gwent.one has no art at this size (pipeline/check_art.py) */
export const NA_LOW = 1, NA_MED = 2

/** pg = playgwent preview · frame = leader ability card back with a border (crop it in small views) */
export interface ArtSrc { url: string; pg: boolean; frame?: boolean }
type ArtCard = { id?: number; art: number; pi?: string; na?: number; t?: string; tok?: number; lq?: string }

/** set by vite.config.ts at build time (true only for build:web) */
const LOCAL = typeof __LOCAL_ART__ !== 'undefined' && __LOCAL_ART__
/** self-hosted file (one size, 376 px wide, used for every view) · key like the LQIP: c<card id> or a<art id> for tokens */
export const localArtUrl = (c: ArtCard) => `${import.meta.env.BASE_URL}art/l/${c.tok ? 'a' + c.art : 'c' + c.id}.webp`

export const artUrl = (c: { art: number }, q: Q) => `${GO}${q}/art/${c.art}.jpg`
const has = (c: ArtCard, q: Q) => !((c.na || 0) & (q === 'low' ? NA_LOW : NA_MED))

/** urls to try in order: playgwent preview → gwent.one at q → gwent.one at the other size (only sizes it has)
 *  local (build:web): own file (if the card has one) → gwent.one at q → gwent.one at the other size */
export function artSources(c: ArtCard, q: Q = 'low', local: boolean = LOCAL): ArtSrc[] {
  const out: ArtSrc[] = []; const other: Q = q === 'low' ? 'medium' : 'low'
  if (local) { if (c.lq) out.push({ url: localArtUrl(c), pg: !!c.pi, ...(c.pi && c.t === 'Ability' ? { frame: true } : {}) }) }
  else if (c.pi) out.push(c.t === 'Ability' ? { url: PG + c.pi, pg: true, frame: true } : { url: PG + c.pi, pg: true })
  if (has(c, q)) out.push({ url: artUrl(c, q), pg: false })
  else if (has(c, other)) out.push({ url: artUrl(c, other), pg: false })
  return out
}

/** tiny blurred placeholder (pipeline LQIP, base64 webp) as a data URL, or undefined */
export const lqipUrl = (c: { lq?: string }) => (c.lq ? 'data:image/webp;base64,' + c.lq : undefined)
