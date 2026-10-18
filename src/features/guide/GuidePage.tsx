// "วิธีใช้" / "Guide": how each part of the site works (text in src/i18n/ui.ts → guide) + "What's new" (src/content/changelog.ts).
// Every section has an anchor (#g-search … #whatsnew); opening the page marks the newest changelog entry as seen.
import { useEffect } from 'react'
import { useActions, useAppState } from '../../store'
import { useT } from '../../i18n/useT'
import { CHANGELOG } from '../../content/changelog'

/** anchors of guide.secs, same order as the dictionary */
export const GUIDE_IDS = ['g-search', 'g-modal', 'g-coll', 'g-deck', 'g-data', 'g-keys', 'g-lang'] as const

export function GuidePage() {
  const a = useActions(); const { lang } = useAppState(); const T = useT(); const G = T.guide, N = T.news
  useEffect(() => { a.markNewsSeen() }, [a])
  return (
    <section id="guide" className="page s-guide">
      <div className="topbar"><div className="tb-row"><h1 className="page-title">{G.title}<small>{G.sub}</small></h1></div></div>
      <div className="guide-body">
        <nav className="gtoc" aria-label={G.toc}><b>{G.toc}</b>
          <ol>{GUIDE_IDS.map((id, i) => <li key={id}><a href={'#' + id}>{G.secs[i].t}</a></li>)}<li><a href="#whatsnew">{N.title}</a></li></ol>
        </nav>
        {GUIDE_IDS.map((id, i) => <section key={id} id={id} className="gsec">
          <h2>{G.secs[i].t}</h2>
          {id === 'g-keys'
            ? <table className="gkeys"><thead><tr><th>{G.keyCol}</th><th>{G.doCol}</th></tr></thead>
              <tbody>{G.keys.map(([k, d]) => <tr key={k}><td><kbd>{k}</kbd></td><td>{d}</td></tr>)}</tbody></table>
            : G.secs[i].p.map((t, j) => <p key={j} dangerouslySetInnerHTML={{ __html: t }} />)}
        </section>)}
        <section id="whatsnew" className="gsec news">
          <h2>{N.title}</h2><p className="hint">{N.sub}</p>
          {CHANGELOG.map(e => <article key={e.version} className="news-item" data-ver={e.version}>
            <h3>{N.ver(e.version, e.date)}</h3>
            <ul>{(lang === 'en' ? e.en : e.th).map((t, j) => <li key={j}>{t}</li>)}</ul>
          </article>)}
        </section>
      </div>
    </section>
  )
}
