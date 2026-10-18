import type { AnyCard, Lang } from '../types'

/** ability text in the chosen language (falls back to English when no Thai) */
export const abText = (c: AnyCard, lang: Lang) => (lang === 'th' && c.abT ? c.abT : c.ab)
/** flavor text in the chosen language (falls back to English when no Thai) */
export const flText = (c: AnyCard, lang: Lang) => (lang === 'th' && c.flT ? c.flT : c.fl)

/** one ability line (by index) for pair explanations; Thai only when TH/EN line counts match; max 140 chars */
export function abLine(c: AnyCard, i: number, lang: Lang): string {
  if (i < 0) return ''
  const pick = (t?: string) => (t || '').split('\n').filter(l => l.trim())
  const en = pick(c.ab), th = pick(c.abT)
  let l = (lang === 'th' && th.length === en.length && th[i]) ? th[i] : en[i]
  l = (l || '').trim()
  return l.length > 140 ? l.slice(0, 138) + '…' : l
}
