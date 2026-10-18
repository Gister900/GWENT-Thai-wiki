// The site logo — the one place to change it. `full` = shield with the WIKI ribbon (sidebar, home header) ·
// `shield` = plain shield without text (collapsed sidebar, phone header; favicons are made from the same image, see vite.config.ts).
// Images are small webp files (2× the shown size); build:single inlines them, build:web serves them as files under the base path.
import full128 from '../assets/logo-128.webp'
import full384 from '../assets/logo-384.webp'
import shield96 from '../assets/shield-96.webp'

type Kind = 'side' | 'hero' | 'shield'
const SRC: Record<Kind, string> = { side: full128, hero: full384, shield: shield96 }

/** decorative by default (the site name is always written next to it) */
export function Logo({ kind, alt = '' }: { kind: Kind; alt?: string }) {
  return <img className={'logo logo-' + kind} src={SRC[kind]} alt={alt} aria-hidden={alt ? undefined : true} draggable={false} />
}
