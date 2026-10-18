import type { AnyCard } from '../types'
import { esc, fmtAb } from './format'

/** regex matching any keyword name (longest first) with optional plural s/es */
export function makeKwRe(names: string[]): RegExp {
  const sorted = [...names].sort((a, b) => b.length - a.length)
  return new RegExp('\\b(' + sorted.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?:s|es)?\\b', 'g')
}

/** wrap keywords found in the text parts of an HTML string with popover buttons */
export function kwWrap(html: string, re: RegExp): string {
  return html.split(/(<[^>]+>)/).map(p => p.startsWith('<') ? p : p.replace(re, (m, k) => `<button type="button" class="kwb" data-kw="${esc(k)}">${m}</button>`)).join('')
}

/** keywords used in a card's English ability text (unique, in order of first use) */
export function cardKws(c: AnyCard, re: RegExp): string[] {
  const s = new Set<string>()
  ;(c.ab || '').replace(re, (m: string, k: string) => { s.add(k); return m })
  return [...s]
}

/** ability text → HTML with bold labels + keyword buttons */
export const fmtAb2 = (s: string, re: RegExp) => kwWrap(fmtAb(s), re)
