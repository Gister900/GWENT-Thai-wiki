// Several decks: the deck picker (deck builder header + sidebar deck box), the deck bar (new · duplicate · rename ·
// delete · copy link · export · import) and the "Import this deck?" dialog for #deck=<code> links.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Deck } from '../../types'
import { BYID } from '../../lib/data'
import { FAC } from '../../lib/constants'
import { deckTot } from '../../lib/deckRules'
import { DeckError, decksExport, parseDecksFile, showName, type SavedDeck } from '../../lib/decks'
import { codeFromHash, decodeDeck, deckLink } from '../../lib/deckCode'
import { toast } from '../../components/Toast'
import { useActions, useAppState } from '../../store'
import { useT } from '../../i18n/useT'

/** <dialog> opened as a modal while `open` is true (Esc / Cancel call onClose) */
function Dlg({ id, open, title, onClose, children }: { id: string; open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); else if (!open && d.open) d.close() }, [open])
  return <dialog ref={ref} className="about dlg" id={id} aria-labelledby={id + 'T'} onClose={onClose} onCancel={e => { e.preventDefault(); onClose() }}>
    <h2 id={id + 'T'}>{title}</h2>{open && children}
  </dialog>
}

const errText = (e: unknown, err: Record<string, string>) => (e instanceof DeckError ? err[e.code] + (e.detail ? ` (${e.detail})` : '') : err.shape)

/** select of the saved decks (name · card count) */
export function DeckSelect({ id }: { id: string }) {
  const { decks, activeId, lang } = useAppState(); const a = useActions(); const T = useT().decks
  return <select className="select deck-sel" id={id} aria-label={T.selAria} value={activeId} onChange={e => a.switchDeck(e.target.value)}>
    {decks.map(d => <option key={d.id} value={d.id}>{showName(d.name, lang)} · {d.f ? FAC[d.f].th + ' · ' + deckTot(d, BYID).n : T.empty}</option>)}
  </select>
}

function download(name: string, data: unknown) {
  const el = document.createElement('a')
  el.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }))
  el.download = name
  document.body.appendChild(el); el.click(); setTimeout(() => { URL.revokeObjectURL(el.href); el.remove() }, 500)
}
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'deck'

async function copyText(input: HTMLInputElement | null, text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true } catch { /* file:// or no permission: fall back */ }
  try { if (input) { input.focus(); input.select(); return document.execCommand('copy') } } catch { /* ignore */ }
  return false
}

/** deck builder header: picker + deck actions */
export function DeckBar() {
  const { decks, activeId, deck, lang } = useAppState(); const a = useActions(); const T = useT().decks
  const cur = decks.find(d => d.id === activeId) as SavedDeck, curName = showName(cur.name, lang)
  const [dlg, setDlg] = useState<'' | 'rename' | 'share'>('')
  /** phone: the actions fold behind "⋯" so the sticky header stays short */
  const [more, setMore] = useState(false)
  const [name, setName] = useState('')
  const [link, setLink] = useState('')
  const linkIn = useRef<HTMLInputElement>(null), file = useRef<HTMLInputElement>(null)

  const share = () => {
    if (!deck.f) { toast(T.noFacShare); return }
    const l = deckLink(location.href, deck); setLink(l); setDlg('share')
    // copy right away; the dialog keeps the link visible in case the clipboard is not allowed
    setTimeout(() => copyText(linkIn.current, l).then(ok => toast(ok ? T.copied : T.copyFail)), 50)
  }
  const exp = (all: boolean) => {
    const day = new Date().toISOString().slice(0, 10)
    download(all ? `gwent-decks-all-${day}.json` : `gwent-deck-${slug(curName)}-${day}.json`, decksExport(all ? decks : [cur], new Date()))
  }
  const imp = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target; const f = input.files?.[0]; if (!f) return
    const r = new FileReader()
    r.onload = () => {
      try { const list = parseDecksFile(String(r.result), BYID); a.addDecks(list); toast(T.imported(list.length)) }
      catch (err) { toast(T.impBad(errText(err, T.err))) }
      input.value = ''
    }
    r.readAsText(f)
  }
  const del = () => { if (!confirm(T.delQ(curName))) return; a.deleteDeck(cur.id); toast(T.deleted(curName)) }

  return <div className="deckbar" id="deckBar">
    <DeckSelect id="deckSel" />
    <button type="button" className="btn deck-more" id="deckMore" aria-expanded={more} onClick={() => setMore(v => !v)}>{T.more}</button>
    <div className={'deckbar-btns' + (more ? ' open' : '')} onClick={e => { if ((e.target as Element).closest('button')) setMore(false) }}>
      <button type="button" className="btn" id="deckNew" onClick={() => { a.newDeck(); toast(T.created) }}>{T.newB}</button>
      <button type="button" className="btn" id="deckDup" onClick={() => { a.dupDeck(cur.id); toast(T.duped) }}>{T.dup}</button>
      <button type="button" className="btn" id="deckRename" onClick={() => { setName(curName); setDlg('rename') }}>{T.rename}</button>
      <button type="button" className="btn" id="deckDel" onClick={del}>{T.del}</button>
      <button type="button" className="btn" id="deckShare" onClick={share}>{T.share}</button>
      <button type="button" className="btn" id="deckExp" onClick={() => exp(false)}>{T.exp}</button>
      <button type="button" className="btn" id="deckExpAll" onClick={() => exp(true)}>{T.expAll}</button>
      <button type="button" className="btn" id="deckImpB" onClick={() => file.current?.click()}>{T.imp}</button>
      <input type="file" id="deckImp" accept=".json,application/json" hidden ref={file} onChange={imp} />
    </div>
    <Dlg id="renameDlg" open={dlg === 'rename'} title={T.renameTitle} onClose={() => setDlg('')}>
      <form onSubmit={e => { e.preventDefault(); a.renameDeck(cur.id, name); setDlg('') }}>
        <label className="dlg-field"><span>{T.nameLbl}</span><input id="renameIn" className="select" maxLength={60} value={name} autoFocus onChange={e => setName(e.target.value)} /></label>
        <div className="dlg-btns"><button type="button" className="about-close" onClick={() => setDlg('')}>{T.cancel}</button><button type="submit" className="about-close primary" id="renameOk" disabled={!name.trim()}>{T.save}</button></div>
      </form>
    </Dlg>
    <Dlg id="shareDlg" open={dlg === 'share'} title={T.shareTitle} onClose={() => setDlg('')}>
      <p>{T.shareHint}</p>
      <input id="shareLink" className="select share-link" readOnly value={link} ref={linkIn} onFocus={e => e.target.select()} />
      <div className="dlg-btns"><button type="button" className="about-close" onClick={() => setDlg('')}>{T.close}</button>
        <button type="button" className="about-close primary" id="shareCopy" onClick={() => copyText(linkIn.current, link).then(ok => toast(ok ? T.copied : T.copyFail))}>{T.copy}</button></div>
    </Dlg>
  </div>
}

/** remove the #deck=… part from the address without adding a history entry */
function clearHash() {
  try { history.replaceState(history.state, '', location.href.split('#')[0]) } catch { location.hash = '' }
}

/** opened with #deck=<code>: preview + "Import" (adds a new deck), then the hash is cleared · broken links → warning, no crash */
export function DeckLinkImport() {
  const a = useActions(); const T = useT().decks
  const [pending, setPending] = useState<Deck | null>(null)
  useEffect(() => {
    const check = () => {
      const code = codeFromHash(location.hash); if (code === null) return
      clearHash()
      try { setPending(decodeDeck(code, BYID)) } catch { setPending(null); toast(T.linkBad) }
    }
    check(); addEventListener('hashchange', check); return () => removeEventListener('hashchange', check)
  }, [T])
  const d = pending, tot = d ? deckTot(d, BYID) : null
  const done = () => setPending(null)
  return <Dlg id="linkDlg" open={!!d} title={T.linkTitle} onClose={done}>
    {d && tot && <>
      <p>{T.linkHint}</p>
      <dl className="link-pv" id="linkPv">
        <dt>{T.pvFac}</dt><dd data-pv="fac">{FAC[d.f].th}</dd>
        <dt>{T.pvLeader}</dt><dd data-pv="leader">{tot.L ? tot.L.n : T.pvNone}</dd>
        <dt>{T.pvCards}</dt><dd data-pv="cards">{T.pvCount(tot.n, tot.u)}</dd>
      </dl>
      <div className="dlg-btns"><button type="button" className="about-close" id="linkNo" onClick={done}>{T.cancel}</button>
        <button type="button" className="about-close primary" id="linkYes" onClick={() => {
          a.addDecks([{ name: FAC[d.f].th + (tot.L ? ' · ' + tot.L.n : ''), deck: d }]); done(); a.showTab('deck'); toast(T.imported(1))
        }}>{T.impB}</button></div>
    </>}
  </Dlg>
}
