// "เล่นคู่กับ" explanation lines (HTML string; every dynamic part is escaped)
import type { AnyCard, Lang, PairReason } from '../types'
import { esc } from './format'
import { abLine } from './i18n'
import { ui } from '../i18n/ui'

export function pairWhy(a: AnyCard, b: AnyCard, rs: PairReason[], lang: Lang, plbl: Record<string, string>): string {
  const Q = (c: AnyCard, i: number) => { const l = abLine(c, i, lang); return l ? `<b>${esc(c.n)}</b>: <q>${esc(l)}</q>` : `<b>${esc(c.n)}</b>` }
  const t = ui(lang).pair, ex = esc
  const AR = `<span class="ar" aria-label="${esc(t.with)}">↔</span>`
  return rs.map(([k, x, la, lb]) => {
    let lab = t.k[k] || k, body = ''
    if (k === 'n') body = la >= 0 ? `${Q(a, la)}${AR}<b>${esc(b.n)}</b> ${esc(t.named)}` : `${Q(b, lb)}${AR}<b>${esc(a.n)}</b> ${esc(t.named)}`
    else if (k === 'm') { lab = t.lbl[x] || plbl[x] || x; body = `${Q(a, la)}${AR}${Q(b, lb)}` }
    else if (k === 't') { lab = t.tag(x); body = lb >= 0 ? `${Q(a, la)}${AR}${Q(b, lb)}${ex(t.bothTag(x))}` : `${Q(a, la)}${AR}<b>${esc(b.n)}</b>${ex(t.hasTag(x))}` }
    else if (k === 'tr') { lab = t.tagBack(x); body = `${Q(b, lb)}${AR}<b>${esc(a.n)}</b>${ex(t.hasTag(x))}` }
    else if (k === 'h') { lab = 'Harmony'; body = la >= 0 ? `${Q(a, la)}${AR}<b>${esc(b.n)}</b>${ex(t.harmony(x))}` : `<b>${esc(a.n)}</b>${ex(t.harmonyB(x))}${AR}${Q(b, lb)}` }
    else if (k === 'a') body = ex(t.sameArch(x))
    return `<span class="rs"><span class="rk">${esc(lab)}</span>${body}</span>`
  }).join('')
}
