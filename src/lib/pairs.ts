// "เล่นคู่กับ" explanation lines (HTML string; every dynamic part is escaped)
import type { AnyCard, Lang, PairReason } from '../types'
import { esc } from './format'
import { abLine } from './i18n'

const KLBL: Record<string, string> = { n: 'เอ่ยชื่อ', m: 'กลไก', t: 'แท็ก', tr: 'แท็ก (ทางกลับ)', h: 'Harmony', a: 'เดคแนวเดียวกัน' }

export function pairWhy(a: AnyCard, b: AnyCard, rs: PairReason[], lang: Lang, plbl: Record<string, string>): string {
  const Q = (c: AnyCard, i: number) => { const l = abLine(c, i, lang); return l ? `<b>${esc(c.n)}</b>: <q>${esc(l)}</q>` : `<b>${esc(c.n)}</b>` }
  const AR = '<span class="ar" aria-label="เข้ากับ">↔</span>'
  return rs.map(([k, x, la, lb]) => {
    let lab = KLBL[k] || k, body = ''
    if (k === 'n') body = la >= 0 ? `${Q(a, la)}${AR}<b>${esc(b.n)}</b> (ถูกเอ่ยชื่อ)` : `${Q(b, lb)}${AR}<b>${esc(a.n)}</b> (ถูกเอ่ยชื่อ)`
    else if (k === 'm') { lab = plbl[x] || x; body = `${Q(a, la)}${AR}${Q(b, lb)}` }
    else if (k === 't') { lab = 'แท็ก ' + x; body = lb >= 0 ? `${Q(a, la)}${AR}${Q(b, lb)} (มีแท็ก ${esc(x)} และอ้าง ${esc(x)} เหมือนกัน)` : `${Q(a, la)}${AR}<b>${esc(b.n)}</b> มีแท็ก ${esc(x)}` }
    else if (k === 'tr') { lab = 'แท็ก ' + x + ' (ทางกลับ)'; body = `${Q(b, lb)}${AR}<b>${esc(a.n)}</b> มีแท็ก ${esc(x)}` }
    else if (k === 'h') { lab = 'Harmony'; body = la >= 0 ? `${Q(a, la)}${AR}<b>${esc(b.n)}</b> แท็กหลัก ${esc(x)} (หายากในฝ่าย นับ Harmony ได้ง่าย)` : `<b>${esc(a.n)}</b> แท็กหลัก ${esc(x)} (หายากในฝ่าย)${AR}${Q(b, lb)}` }
    else if (k === 'a') body = `อยู่ในเดคแนว ${esc(x)} ด้วยกัน`
    return `<span class="rs"><span class="rk">${esc(lab)}</span>${body}</span>`
  }).join('')
}
