import { useMemo, useState } from 'react'
import { ARCH, BYID, CARDS, PLBL } from '../../lib/data'
import { buildPairIndex, reasonLabel, recommend } from '../../lib/recommend'
import { ownN } from '../../lib/collection'
import { COL } from '../../lib/constants'
import * as storage from '../../lib/storage'
import { Thumb } from '../../components/images'
import { useActions, useAppState } from '../../store'
import { useT } from '../../i18n/useT'

const IX = buildPairIndex(CARDS)
const MAXV = 3

/** "แนะนำให้เพิ่ม" box in the deck column: top 10 cards that pair with what is already in the deck */
export function Recommend() {
  const { deck, own, lang } = useAppState(); const a = useActions(); const TT = useT(); const RT = TT.rec
  const [ownedOnly, setOwnedOnly] = useState(storage.loadRecOwned)
  const list = useMemo(() => recommend(deck, BYID, CARDS, IX, { ownedOnly, owned: id => ownN(own, id, BYID), arch: ARCH }), [deck, own, ownedOnly])
  const ids = useMemo(() => list.map(x => x.card.id), [list])
  const empty = !Object.keys(deck.c).some(i => BYID[+i]) && !(deck.L && BYID[deck.L])

  const cls: Record<string, string> = { pair: 'pair', leader: 'lead', arch: 'arch', units: 'bal', prov: 'bal' }
  return (
    <div className="panel rec" id="dRec">
      <div className="panel-hd"><h3>{RT.title}</h3>
        <label className="chk-own"><input type="checkbox" id="recOwned" checked={ownedOnly} onChange={e => { setOwnedOnly(e.target.checked); storage.saveRecOwned(e.target.checked) }} /> {RT.owned}</label></div>
      <div className="panel-bd">
        {deck.f && !empty && <p className="hint">{RT.basis(list.length)}</p>}
        {!deck.f ? <p className="hint">{RT.noFac}</p>
          : empty ? <p className="hint" id="recEmpty">{RT.empty}</p>
          : !list.length ? <p className="hint" id="recEmpty">{ownedOnly ? RT.noneOwned : RT.none}</p>
          : <div className="reclist" id="recList">{list.map(({ card: c, via, leader, arch, tags }) => (
            <div key={c.id} className="rec-item rc" data-rec={c.id}>
              <button type="button" className={'th t-' + (c.c === 'Gold' ? 'gold' : 'bronze')} data-open={c.id} title={TT.card.openBig} onClick={() => a.openModal(c.id, ids)}><Thumb c={c} lazy /><span className="pv">{c.v}</span></button>
              <div className="rcb">
                <h5><button type="button" className="rname" data-open={c.id} onClick={() => a.openModal(c.id, ids)}>{c.n}</button><span className="score">{COL[c.c].t} · {c.t === 'Unit' ? RT.power(c.p) : c.t}{c.f === 'Neutral' ? ' · Neutral' : ''}{deck.c[c.id] ? RT.inDeck(deck.c[c.id]) : ''}</span></h5>
                <div className="reasons rcw">{tags.map(t => <span key={t.k} className={'rsn rtag ' + (cls[t.k] || 'bal')} data-tag={t.k}>{
                  t.k === 'pair' ? <>{RT.pair} {via.slice(0, MAXV).map((v, i) => {
                    const lb = reasonLabel(v.reason, PLBL, lang)
                    return <span key={v.id}>{i > 0 && ' · '}<button type="button" className="rcn" data-open={v.id} onClick={() => a.openModal(v.id, null)}>{BYID[v.id].n}</button>{lb && ` (${lb})`}</span>
                  })}{via.length > MAXV && <span className="rcmore"> +{via.length - MAXV}</span>}</>
                  : t.k === 'leader' ? `${RT.leader}${leader?.reason ? ' · ' + reasonLabel(leader.reason, PLBL, lang) : ''}`
                  : t.k === 'arch' ? RT.arch((lang === 'th' && arch?.name_th) || arch?.name || '')
                  : t.k === 'units' ? RT.units : RT.prov
                }</span>)}</div>
              </div>
              <button type="button" className="add" data-act="add" data-id={c.id} aria-label={TT.card.addOf(c.n)} onClick={() => a.addToDeck(c.id)}>+</button>
            </div>))}</div>}
        <div className="legend"><span className="rsn pair">{RT.lgPair}</span><span className="rsn lead">{RT.lgLeader}</span><span className="rsn arch">{RT.lgArch}</span><span className="rsn bal">{RT.lgBal}</span></div>
      </div>
    </div>
  )
}
