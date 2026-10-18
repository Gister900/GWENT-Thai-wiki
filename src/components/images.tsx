// Card images. URL order comes from src/lib/art.ts (playgwent preview → gwent.one, skipping sizes the pipeline
// knows gwent.one does not have); on error try the next url, then fall back. A tiny blurred placeholder (LQIP from the
// pipeline) shows while the real image loads, and the real image fades in over it.
import { useState, type CSSProperties, type ReactNode } from 'react'
import type { AnyCard } from '../types'
import { artSources, lqipUrl, type Q } from '../lib/art'
import { useT } from '../i18n/useT'

export { artUrl } from '../lib/art'

/** walk the url list: src = current url (undefined = none left) · next() on error · loaded/onLoad for the fade */
function useArt(c: AnyCard, q: Q) {
  const src = artSources(c, q)
  const [i, setI] = useState(0); const [done, setDone] = useState('')
  const s = src[i]
  return { s, ld: !!s && done === s.url, onLoad: () => s && setDone(s.url), next: () => setI(n => n + 1) }
}

/** blurred placeholder layer (sits under the real image; CSS .lqip) */
function Lq({ c, pos }: { c: AnyCard; pos: string }) {
  const u = lqipUrl(c)
  return u ? <span className="lqip" aria-hidden="true" style={{ backgroundImage: `url(${u})`, backgroundPosition: pos }} /> : null
}

/** card art (.gc-art) — playgwent / gwent.one, then the "(ไม่มีรูป)" text · modal (q=medium) shows the preview uncropped */
/** pri = first row on screen: load now with fetchpriority="high" instead of lazy */
export function CardArt({ c, children, q = 'low', pri }: { c: AnyCard; children?: ReactNode; q?: Q; pri?: boolean }) {
  const { s, ld, onLoad, next } = useArt(c, q); const T = useT()
  const pos = q === 'medium' ? 'center' : 'center 22%'; const fade = !!c.lq
  const crop = s?.frame && q === 'low' ? 'pgl' : ''
  return (
    <div className={'gc-art' + (!s ? ' noimg' : '')}>
      {s && <Lq c={c} pos={pos} />}
      {s && <img key={s.url} className={[crop, fade ? 'fade' : '', fade && ld ? 'ld' : ''].filter(Boolean).join(' ') || undefined} loading={q === 'low' && !pri ? 'lazy' : undefined} fetchPriority={pri ? 'high' : undefined} decoding="async"
        src={s.url} alt={c.n} data-pi={c.pi || ''} onLoad={onLoad} onError={next} />}
      <div className="alt">{c.n}<br />{T.card.noImg}</div>
      {children}
    </div>
  )
}

/** small thumbnail — playgwent / gwent.one, then a letter tile (.noth) · placeholder = background of the img */
export function Thumb({ c, lazy, cls }: { c: AnyCard; lazy?: boolean; cls?: string }) {
  const { s, next } = useArt(c, 'low')
  if (!s) return <i className={'noth' + (cls ? ' ' + cls : '')}>{(c.n || '?').charAt(0)}</i>
  const u = lqipUrl(c); const st: CSSProperties = {}
  if (u) { st.backgroundImage = `url(${u})`; st.backgroundSize = 'cover'; st.backgroundPosition = 'center 22%' }
  return <img key={s.url} className={[cls, s.frame ? 'pgl' : ''].filter(Boolean).join(' ') || undefined} loading={lazy ? 'lazy' : undefined} decoding={lazy === false ? undefined : 'async'} src={s.url} alt="" data-pi={c.pi || ''} data-n={c.n}
    style={Object.keys(st).length ? st : undefined} onError={next} />
}

/** big background art (faction tile · faction banner): playgwent preview → gwent.one → nothing (faction colour) */
/** pri = on the first screen: fetchpriority="high" (default) · false = lazy */
export function HeroArt({ c, pri = true }: { c: AnyCard; pri?: boolean }) {
  const { s, ld, onLoad, next } = useArt(c, 'medium')
  if (!s) return null
  return <>
    <Lq c={c} pos="center 22%" />
    <img key={s.url} className={'hero-art' + (s.frame ? ' pgl' : '') + (c.lq ? ' fade' + (ld ? ' ld' : '') : '')} src={s.url} alt="" fetchPriority={pri ? 'high' : undefined} loading={pri ? undefined : 'lazy'} decoding="async"
      onLoad={onLoad} onError={next} />
  </>
}
