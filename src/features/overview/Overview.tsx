import { memo } from 'react'
import { FAC, FAC_ORDER } from '../../lib/constants'
import { useT } from '../../i18n/useT'
import { ARCH, CARDS, KW, META, getCard } from '../../lib/data'
import { FI } from '../../components/FactionIcon'
import { SourceLinks } from '../../components/SourceLinks'
import { useActions, useLang } from '../../store'
import type { Archetype } from '../../types'

/** core rules box (HTML lines from the dictionary) */
function Rules() {
  const O = useT().ov
  return <div className="panel rules"><h3>{O.rulesTitle}</h3><ul>{O.rules.map((h, i) => <li key={i} dangerouslySetInnerHTML={{ __html: h }} />)}</ul></div>
}

/** one faction's deck styles (name, summary, keywords, key cards, tips, sources) — also used on the faction page */
export function ArchList({ arr }: { arr: Archetype[] }) {
  const a = useActions(); const O = useT().ov; const en = useLang() === 'en'
  return <div className="archs"><h4 className="archs-h">{O.styles}</h4>
    {arr.map((x, i) => <div className="arch" key={i}>
      <h4>{x.name}{x.name_th && !en ? ' · ' + x.name_th : ''}</h4>
      {(en ? x.summary_en : x.summary_th) && <div className="asum">{en ? x.summary_en : x.summary_th}</div>}
      {(x.keywords || []).length > 0 && <div className="klinks">{x.keywords!.map((k, j) => KW[k] ? <button key={j} type="button" className="kwb kw" data-kw={k}>{k}</button> : <span key={j} className="kw">{k}</span>)}</div>}
      {(x.key_cards || []).length > 0 && <div className="klinks">{O.keyCards} {x.key_cards!.map(Number).filter(getCard).map((id, j) => <button key={j} type="button" className="klink" data-open={id} onClick={() => a.openModal(id, null)}>{getCard(id)!.n}</button>)}</div>}
      {((en ? x.tips_en : x.tips) || []).length > 0 && <ul>{(en ? x.tips_en : x.tips)!.map((t, j) => <li key={j}>{t}</li>)}</ul>}
      <SourceLinks arr={x.sources} />
    </div>)}
  </div>
}

/** "ภาพรวมเกม & ฝ่าย" tab: rules + one box per faction with its deck archetypes */
export const Overview = memo(function Overview({ hidden }: { hidden: boolean }) {
  const T = useT(); const O = T.ov
  return (
    <section id="ov" className={'page s-ov' + (hidden ? ' hidden' : '')}>
      <div className="topbar"><div className="tb-row"><h1 className="page-title">{O.title}<small>{O.sub}</small></h1></div></div>
      <div className="ov-body">
      <Rules />
      <p className="hint src" dangerouslySetInnerHTML={{ __html: O.src(META.ver, META.count) }} />
      <div className="ov-grid" id="fgrid">
        {FAC_ORDER.map(f => {
          const arr = (ARCH && ARCH[f]) || []
          return <div className={'panel ovf fc-' + FAC[f].cls} key={f}>
            <h3><FI f={f} /> {FAC[f].th}<span className="cnt">{T.n(CARDS.filter(c => c.f === f).length)}</span></h3>
            <p><b>{T.fac.desc[f][0]}</b></p>
            <p dangerouslySetInnerHTML={{ __html: T.fac.desc[f][1] }} />
            {arr.length > 0 && <ArchList arr={arr} />}
          </div>
        })}
      </div>
      </div>
    </section>
  )
})
