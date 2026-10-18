import { BYID } from '../../lib/data'
import { craftPlan, parseScraps } from '../../lib/craft'
import { ownN } from '../../lib/collection'
import { Thumb } from '../../components/images'
import { useActions, useAppState } from '../../store'
import { useT } from '../../i18n/useT'

/** "แผนคราฟต์": missing copies cheapest first vs scraps on hand */
export function CraftPlanBox() {
  const { deck, own, scraps } = useAppState(); const a = useActions(); const K = useT().craft
  const { items, total, have, last, rows } = craftPlan(deck, BYID, id => ownN(own, id, BYID), parseScraps(scraps))
  const verdict = !items.length ? <b>{K.allOwned}</b>
    : have === null ? K.enterScraps
    : have >= total ? <><b className="okc">{K.enough}</b>{K.enoughT(have, total)}</>
    : <><b className="short">{K.short}</b>{K.shortT(have, total)}<b className="short">{total - have}</b>{K.shortU}</>
  const reach = have === null || !items.length ? null
    : last < 0 ? <div>{K.noFirst(items[0].n)}</div>
    : <div>{K.reach(last + 1)}<b>{items[last].n}</b>{last + 1 < items.length ? K.rest(items.length - last - 1) : ''}</div>
  return <>
    <div className="panel-hd"><h3>{K.title}</h3><span className="sub">{K.sub}</span></div>
    <div className="panel-bd">
      <label className="scr">{K.scraps}<input type="number" className="select" id="dScr" min="0" step="1" inputMode="numeric" placeholder={K.ph} value={scraps} onChange={e => a.setScraps(e.target.value)} /></label>
      {rows.map(({ c, cum, can }, i) => <div className={'craft-row' + (have !== null && !can ? ' no' : '')} key={i}>
        <Thumb c={c} lazy />
        <b className="nm" data-open={c.id} onClick={() => a.openModal(c.id, null)}>{c.n} <small>{c.c} · {c.r}</small></b>
        <span className="st">{have === null ? '#' + (i + 1) : can ? K.can : K.over}</span>
        <span className="cost">⚒ {c.cc || 0}<small>{K.cum(cum)}</small></span>
      </div>)}
      <div className="csum">
        <div>{K.missing} <b>{items.length}</b>{K.missingT(items.length)}<b>{total}</b>{K.missingU}</div>
        {have !== null && items.length > 0 && <div className="bar"><i style={{ width: Math.min(100, total ? have / total * 100 : 100) + '%' }} /></div>}
        <div>{verdict}</div>{reach}
      </div>
    </div>
  </>
}
