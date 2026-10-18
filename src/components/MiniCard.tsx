import type { AnyCard } from '../types'
import { FAC } from '../lib/constants'
import { Thumb } from './images'
import { useActions } from '../store'
import { useT } from '../i18n/useT'

/** small framed card (pairs, related cards, tokens) — opens that card in the modal (inside the modal: remembered in the back history) */
export function MiniCard({ c }: { c: AnyCard }) {
  const a = useActions(); const T = useT()
  const t = c.c === 'Gold' ? 'gold' : c.c === 'Leader' ? 'leader' : 'bronze'
  return <button type="button" className="mini" data-open={c.id} onClick={e => { if (e.currentTarget.closest('#modal')) a.pushModal(c.id); else a.openModal(c.id, null) }}>
    <span className={'mc t-' + t}><Thumb c={c} />{c.v !== undefined && !c.tok ? <span className="pv">{c.v}</span> : null}</span>
    <b>{c.n}</b><small>{FAC[c.f] ? FAC[c.f].th : c.f} · {c.t === 'Unit' ? T.card.power + ' ' + c.p : c.t}{c.tok ? ' · Token' : ''}</small>
  </button>
}
