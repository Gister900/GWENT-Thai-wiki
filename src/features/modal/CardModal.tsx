import { useLayoutEffect, useRef } from 'react'
import type { AnyCard } from '../../types'
import { COL, FAC } from '../../lib/constants'
import { useT } from '../../i18n/useT'
import { ARCH, BYID, CTIPS, HAS_KWTH, KW, KWRE, PLBL, abHTML, getCard, hasTip } from '../../lib/data'
import { cardKws } from '../../lib/keywords'
import { pairWhy } from '../../lib/pairs'
import { maxCopiesC, ownN } from '../../lib/collection'
import { FI } from '../../components/FactionIcon'
import { CardArt } from '../../components/images'
import { StarButton } from '../../components/CardButtons'
import { SourceLinks } from '../../components/SourceLinks'
import { MiniCard } from '../../components/MiniCard'
import { useActions, useAppState, type ModalState } from '../../store'

function archFor(id: number) {
  const r: NonNullable<typeof ARCH>[string] = []; if (!ARCH) return r
  for (const f in ARCH) (ARCH[f] || []).forEach(a => { if ((a.key_cards || []).map(Number).includes(id)) r.push(a) })
  return r
}

const Html = ({ cls, html, tag = 'div' }: { cls: string; html: string; tag?: 'div' | 'span' }) => tag === 'span' ? <span className={cls} dangerouslySetInnerHTML={{ __html: html }} /> : <div className={cls} dangerouslySetInnerHTML={{ __html: html }} />
const tierOf = (c: AnyCard) => (c.c === 'Gold' ? 'gold' : c.c === 'Leader' ? 'leader' : 'bronze')
const powSym = (c: AnyCard) => (c.t === 'Unit' ? String(c.p) : c.c === 'Leader' ? '♛' : c.t === 'Artifact' ? '⚱' : '✦')

function ModalBody({ c, title }: { c: AnyCard; title: string }) {
  const { stars, own, deck, lang } = useAppState(); const a = useActions(); const T = useT(); const M = T.modal; const en = lang === 'en'
  const ar = archFor(c.id)
  const kws = cardKws(c, KWRE).filter(k => KW[k])
  const ks = HAS_KWTH ? kws : []
  const kwTips = (k: string) => (en ? KW[k].tipsEn : KW[k].tips) || []
  const rel = (c.rel || []).map(getCard).filter(Boolean) as AnyCard[]
  const card = !c.tok ? BYID[c.id] : undefined
  const owned = card ? ownN(own, c.id, BYID) : 0, mx = card ? maxCopiesC(card) : 0, isAb = c.t === 'Ability'
  const setN = (n: number) => { if (card) a.setOwnCards({ [c.id]: Math.max(0, Math.min(mx, n)) }) }
  const inDeck = deck.c[c.id] || 0
  const stats: [React.ReactNode, string][] = []
  if (c.t === 'Unit') stats.push([c.p, M.power])
  if (c.ar) stats.push([c.ar, M.armor])
  if (!c.tok) stats.push([isAb ? '+' + c.v : c.v, isAb ? M.provAdd : 'Provision'])
  if (card && !isAb) stats.push([card.cc || 0, M.craft], [`${owned}/${mx}`, M.inColl])
  const tags: React.ReactNode[] = [
    FAC[c.f] ? <span className={`tag fac fc-${FAC[c.f].cls}`} key="f"><FI f={c.f} />{FAC[c.f].th}</span> : <span className="tag" key="f">{c.f}</span>,
    c.f2 && FAC[c.f2] ? <span className={`tag fac fc-${FAC[c.f2].cls}`} key="f2"><FI f={c.f2} />+ {FAC[c.f2].th}</span> : null,
    <span className={'tag t-' + tierOf(c)} key="c">{COL[c.c] ? COL[c.c].i + ' ' + COL[c.c].t : c.c}</span>,
    <span className="tag" key="t">{T.type[c.t] || c.t}</span>,
    c.cat ? <span className="tag" key="cat" title={M.tagCat}>{c.cat}</span> : null,
    c.r ? <span className={'tag r-txt-' + c.r} key="r" title={M.rarity}>{c.r}</span> : null,
    c.s ? <span className="tag dim" key="s" title={M.setT}>{M.set(c.s)}</span> : null,
    !c.tok ? <span className="tag dim" key="au" title={M.artistT}>{M.artist(c.au || '—')}</span> : null,
  ]
  return <>
    <div className="m-left">
      <div className={`bigcard gc t-${tierOf(c)} fc-${FAC[c.f]?.cls || 'Neutral'}`}><div className="gc-in">
        <CardArt key={c.id} c={c} q="medium">
          <div className={'gc-pow' + (c.t === 'Unit' ? '' : ' sym')}><b>{powSym(c)}</b></div>
          {c.r ? <div className={`gc-gem r-${c.r}`} title={c.r} /> : null}
          {!c.tok && <div className="gc-prov"><b>{isAb ? '+' + c.v : c.v}</b></div>}
          <div className="gc-name"><span className="name">{c.n}</span></div>
        </CardArt>
      </div></div>
      {stats.length > 0 && <div className="stats">{stats.map(([v, k], i) => <div className="stat" key={i}><b>{v}</b><small>{k}</small></div>)}</div>}
      {card && !isAb && <div className="stepper"><span>{M.stepper}</span><span className="ctl">
        <button type="button" data-act="own-dec" aria-label={M.dec} disabled={owned <= 0} onClick={() => setN(owned - 1)}>−</button>
        <b id="mOwn">{owned} / {mx}</b>
        <button type="button" data-act="own-inc" aria-label={M.inc} disabled={owned >= mx} onClick={() => setN(owned + 1)}>+</button></span></div>}
      {!c.tok ? <div className="m-actions">
        <StarButton id={c.id} starred={stars.has(c.id)} cls={'btn' + (stars.has(c.id) ? ' on' : '')} />
        <button type="button" className="btn gold" data-act="add" data-id={c.id} onClick={() => a.addToDeck(c.id)}>{M.add}{inDeck ? M.inDeck(inDeck) : ''}</button>
      </div> : <p className="src">{M.token}</p>}
    </div>
    <div className="m-right">
      <div>
        <h2 className="m-title" id="mTitle">{title}</h2>
        <div className="m-tags">{tags}</div>
      </div>
      <div className="sect sec"><h3>{M.ability} <small>{c.abT && !en ? M.aiNote : ''}</small></h3>
        {/* Thai mode: Thai (AI) + official English underneath · English mode: English only */}
        {c.abT && !en && <div className="ab-th"><span className="lab">TH</span><Html tag="span" cls="ab" html={abHTML(c.abT)} /></div>}
        <div className={c.abT && !en ? 'ab-en' : 'ab-th'}><span className="lab">EN</span><Html tag="span" cls="ab" html={abHTML(c.ab || '—')} /></div>
        {en ? c.fl && <p className="flavor">“{c.fl}”</p>
          : (c.flT || c.fl) && <p className="flavor">{c.flT ? `“${c.flT}”` : ''}{c.fl && <small>“{c.fl}”</small>}</p>}
      </div>
      {(kws.length > 0 || hasTip(c.id) || ar.length > 0) && <div className={'m-cols' + (kws.length && (hasTip(c.id) || ar.length) ? '' : ' one')}>
        {kws.length > 0 && <div className="sect sec"><h3>{M.kws} <small>{ks.some(k => kwTips(k).length) ? M.kwTips : ''}</small></h3><div className="kwbox">
          {kws.map(k => <div className="kwi" key={k}><b>{k}</b><p>{en ? KW[k].en : KW[k].th || KW[k].en}</p>
            {HAS_KWTH && kwTips(k).length > 0 && <ul className="kwtips">{kwTips(k).map((t, j) => <li key={j}>{t}</li>)}</ul>}</div>)}
        </div></div>}
        {(hasTip(c.id) || ar.length > 0) && <div className="tips-col">
          {hasTip(c.id) && <div className="tipbox sec"><span className="ic" aria-hidden="true">💡</span><div><small>{M.cardTip}</small><ul>{(en ? CTIPS![c.id].tipsEn || [] : CTIPS![c.id].tips!).map((t, j) => <li key={j}>{t}</li>)}</ul><SourceLinks arr={CTIPS![c.id].sources} /></div></div>}
          {ar.map((x, i) => <div className="tipbox arch sec" key={i}><span className="ic" aria-hidden="true">🃏</span><div><small>{M.archOf}</small><b>{x.name}{x.name_th && !en ? ' (' + x.name_th + ')' : ''}</b>{(en ? x.summary_en : x.summary_th) && <p>{en ? x.summary_en : x.summary_th}</p>}{((en ? x.tips_en : x.tips) || []).length > 0 && <ul>{(en ? x.tips_en : x.tips)!.map((t, j) => <li key={j}>{t}</li>)}</ul>}<SourceLinks arr={x.sources} /></div></div>)}
        </div>}
      </div>}
      {(c.pr || []).length > 0 && <div className="sect sec"><h3>{M.pairs} <small>{M.pairsNote}</small></h3><div className="prows">
        {c.pr!.filter(p => BYID[p[0]]).map(([bid, rs]) => <div className="prow" key={bid}>
          <MiniCard c={BYID[bid]} /><Html cls="why" html={pairWhy(c, BYID[bid], rs, lang, PLBL)} />
          <button type="button" className="btn sm" data-act="add" data-id={bid} onClick={() => a.addToDeck(bid)}>{M.addPair}</button></div>)}
      </div></div>}
      {rel.length > 0 && <div className="sect sec"><h3>{M.related} <small>{M.relatedNote}</small></h3><div className="minis">{rel.map((r, i) => <MiniCard key={i} c={r} />)}</div></div>}
    </div>
  </>
}

/** big-card modal: prev/next (buttons, arrow keys, swipe), Esc / backdrop closes */
/** history bar: "← back to <previous card>" + breadcrumb (first … last two · every crumb jumps back to that level) */
function ModalHistBar({ modal }: { modal: ModalState }) {
  const a = useActions(); const M = useT().modal
  const h = modal.hist; if (!h.length) return null
  const name = (id: number) => getCard(id)?.n || String(id)
  const crumbs: React.ReactNode[] = []
  const lvs = h.length + 1 > 4 ? [0, -1, h.length - 1] : h.map((_, i) => i)
  lvs.forEach((lv, i) => {
    if (i > 0) crumbs.push(<span className="sep" key={'s' + i} aria-hidden="true">›</span>)
    crumbs.push(lv < 0
      ? <span className="more" key="more" title={h.slice(1, -1).map(x => name(x.id)).join(' › ')}>…</span>
      : <button type="button" className="crumb" key={lv} data-lv={lv} onClick={() => a.backModal(lv)}>{name(h[lv].id)}</button>)
  })
  crumbs.push(<span className="sep" key="sc" aria-hidden="true">›</span>, <span className="cur" key="cur" aria-current="page">{name(modal.id)}</span>)
  return <nav className="m-hist" id="mHist" aria-label={M.hist}>
    <button type="button" className="btn sm m-back" id="mBack" title={M.backT} onClick={() => a.backModal()}>{M.back(name(h[h.length - 1].id))}</button>
    <div className="m-crumbs">{crumbs}</div>
  </nav>
}

export function CardModal({ modal }: { modal: ModalState | null }) {
  const a = useActions(); const M = useT().modal
  const box = useRef<HTMLDivElement>(null), touch = useRef<{ x: number; y: number } | null>(null)
  useLayoutEffect(() => { if (modal && box.current) box.current.scrollTop = modal.scroll }, [modal])
  const c = modal ? getCard(modal.id) : undefined
  const { idx = -1, list = [] } = modal || {}
  const title = c ? c.n + (list.length > 1 && idx >= 0 ? `  (${idx + 1}/${list.length})` : '') : ''
  return (
    <div className={'modal-wrap' + (c ? '' : ' hidden')} id="mback"
      onClick={e => { if (e.target === e.currentTarget) a.closeModal() }}
      onTouchStart={e => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }}
      onTouchEnd={e => { const t = touch.current; if (!t) return; const dx = e.changedTouches[0].clientX - t.x, dy = e.changedTouches[0].clientY - t.y; touch.current = null; if (Math.abs(dx) > 60 && Math.abs(dy) < 50) a.stepModal(dx < 0 ? 1 : -1) }}>
      <button type="button" className="m-nav m-prev" id="mPrev" aria-label={M.prev} disabled={idx <= 0} onClick={() => a.stepModal(-1)}>‹</button>
      <div className="modal" id="modal" role="dialog" aria-modal="true" aria-labelledby="mTitle" ref={box}>
        <button type="button" className="m-close" id="mClose" aria-label={M.close} onClick={() => a.closeModal()}>✕</button>
        {modal && <ModalHistBar modal={modal} />}
        <div className="m-grid" id="mBody">{c && <ModalBody key={c.id} c={c} title={title} />}</div>
      </div>
      <button type="button" className="m-nav m-next" id="mNext" aria-label={M.next} disabled={idx < 0 || idx >= list.length - 1} onClick={() => a.stepModal(1)}>›</button>
    </div>
  )
}
