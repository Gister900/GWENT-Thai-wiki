import { useMemo } from 'react'
import type { Deck } from '../../types'
import { BYID, CARDS, SKEY } from '../../lib/data'
import { blockWhy, maxCopies } from '../../lib/deckRules'
import { ownN } from '../../lib/collection'
import { pickCards, type PickFilter } from '../../lib/search'
import { CardTile } from '../cards/CardTile'
import { useAppState } from '../../store'
import { useT } from '../../i18n/useT'
import type { Card } from '../../types'
import { UI } from '../../i18n/ui'

/** left column of the deck page: cards of the deck faction + Neutral (click = add) */
export function Picker({ pf, setPf }: { pf: PickFilter; setPf: React.Dispatch<React.SetStateAction<PickFilter>> }) {
  const { deck, own, lang, stars } = useAppState(); const D = useT().deck
  const set = (k: keyof PickFilter) => (e: React.ChangeEvent<HTMLSelectElement>) => setPf(p => ({ ...p, [k]: e.target.value }))
  const list = useMemo(() => deck.f ? pickCards(CARDS, deck.f, pf, c => SKEY.get(c.id)!, id => ownN(own, id, BYID)) : [], [deck.f, pf, own])
  const ids = useMemo(() => list.map(c => c.id), [list])
  return (
    <div className="panel picker dpick">
      <div className="panel-hd"><h3>{D.pick}</h3><span className="sub" id="pCount">{deck.f ? D.pCount(list.length) : ''}</span>
        <div className="pfil">
          <select className="select" id="pCol" aria-label={D.colAria} value={pf.col} onChange={set('col')}><option value="">{D.colAll}</option><option value="Gold">◆ Gold</option><option value="Bronze">● Bronze</option></select>
          <select className="select" id="pType" aria-label={D.typeAria} value={pf.type} onChange={set('type')}><option value="">{D.typeAll}</option><option value="Unit">Unit</option><option value="Special">Special</option><option value="Artifact">Artifact</option><option value="Stratagem">Stratagem</option></select>
          <select className="select" id="pProv" aria-label={D.provAria} value={pf.prov} onChange={set('prov')}><option value="">{D.provAll}</option><option value="0-5">{D.prov5}</option><option value="6-7">6–7</option><option value="8-9">8–9</option><option value="10-11">10–11</option><option value="12-99">{D.prov12}</option></select>
          <select className="select" id="pOwn" aria-label={D.ownAria} value={pf.own} onChange={set('own')}><option value="">{D.ownAll}</option><option value="has">{D.ownHas}</option><option value="none">{D.ownNone}</option></select>
        </div>
      </div>
      <div className="panel-bd">
        <div className="grid" id="dPick">
          {!deck.f ? <div className="pempty"><b>{D.pickFirst}</b><br />{D.pickFirstHint}</div>
            : list.length ? list.map(c => <PickTile key={c.id} c={c} deck={deck} owned={ownN(own, c.id, BYID)} starred={stars.has(c.id)} lang={lang} list={ids} />)
            : <div className="pempty">{D.pickNone}</div>}
        </div>
      </div>
    </div>
  )
}

function PickTile({ c, deck, owned, starred, lang, list }: { c: Card; deck: Deck; owned: number; starred: boolean; lang: 'th' | 'en'; list: number[] }) {
  const n = deck.c[c.id] || 0, m = maxCopies(c), b = blockWhy(c, deck, BYID, lang)
  const block = n < m ? (b ? b.s : null) : UI[lang].card.full(m)
  return <CardTile c={c} lang={lang} starred={starred} owned={owned} mode="pick" inDeck={n} block={block} list={list} />
}
