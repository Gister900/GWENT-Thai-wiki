import { useEffect, useMemo, useRef, useState } from 'react'
import type { Deck, Lang, Own } from './types'
import { ActionsCtx, StateCtx, type Actions, type AppState, type GridPage, type ModalHist, type ModalState, type Tab, type CardsView } from './store'
import { getCard, BYID } from './lib/data'
import { TOAST_MS } from './lib/constants'
import * as storage from './lib/storage'
import * as rules from './lib/deckRules'
import { nextOwn, ownN, setOwn } from './lib/collection'
import { toast, Toast } from './components/Toast'
import { KeywordPopover, hidePop, isPopOpen, showPop } from './components/KeywordPopover'
import { BottomNav, MobileHead, Sidebar } from './features/shell/Sidebar'
import { SiteFooter } from './features/shell/About'
import { Overview } from './features/overview/Overview'
import { CardsPage } from './features/cards/CardsPage'
import { DeckTab } from './features/deck/DeckTab'
import { CardModal } from './features/modal/CardModal'
import { CardsHome } from './features/home/CardsHome'
import { FactionPage } from './features/home/FactionPage'
import { pushRecent } from './lib/recent'

export default function App() {
  const [lang, setLangS] = useState<Lang>(storage.loadLang)
  const [tab, setTab] = useState<Tab>('cards')
  const [view, setView] = useState<CardsView>({ v: 'home' })
  const [allReq, setAllReq] = useState<AppState['allReq']>({ n: 0, preset: null })
  const [recent, setRecentS] = useState<number[]>(storage.loadRecent)
  const [scraps, setScrapsS] = useState(() => storage.loadScraps() ?? '')
  const [collapsed, setCollapsed] = useState(storage.loadSide)
  const [deck, setDeckS] = useState<Deck>(storage.loadDeck)
  const [own, setOwnS] = useState<Own>(storage.loadOwn)
  const [stars, setStarsS] = useState<Set<number>>(storage.loadStars)
  const [newRow, setNewRow] = useState<AppState['newRow']>(null)
  const [modal, setModal] = useState<ModalState | null>(null)

  // refs mirror state so the stable actions always see the latest values synchronously
  const recentR = useRef(recent)
  const deckR = useRef(deck), ownR = useRef(own), starsR = useRef(stars), modalR = useRef(modal)
  const mlist = useRef<number[]>([]), curList = useRef<number[]>([]), newTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  modalR.current = modal

  const actions = useMemo<Actions>(() => {
    const commitDeck = (d: Deck) => { deckR.current = d; setDeckS(d); storage.saveDeck(d) }
    const commitOwn = (o: Own) => { ownR.current = o; setOwnS(o); storage.saveOwn(o) }
    // hist: undefined = fresh open from the page (history cleared) · array = keep/replace the modal history
    const open = (id: number, list: number[] | null, hist?: ModalHist[], scroll = 0) => {
      if (!getCard(id)) return
      if (BYID[id]) { const r = pushRecent(recentR.current, id); if (r !== recentR.current) { recentR.current = r; setRecentS(r); storage.saveRecent(r) } }
      if (list) mlist.current = list
      else if (!mlist.current.includes(id)) mlist.current = curList.current.includes(id) ? curList.current : [id]
      const idx = mlist.current.indexOf(id)
      const h = hist ?? []
      setModal(m => ({ id, idx, list: mlist.current, n: (m?.n || 0) + 1, hist: h, scroll }))
      modalR.current = { id, idx, list: mlist.current, n: 0, hist: h, scroll }
      hidePop()
    }
    const modalScroll = () => document.getElementById('modal')?.scrollTop || 0
    const a: Actions = {
      toggleStar(id) { const s = new Set(starsR.current); if (s.has(id)) s.delete(id); else s.add(id); starsR.current = s; setStarsS(s); storage.saveStars(s) },
      addToDeck(id) {
        const r = rules.addToDeck(deckR.current, id, BYID); if (!r) return false
        if (r.ok) {
          commitDeck(r.deck)
          if (r.added) { setNewRow({ id, t: Date.now() }); clearTimeout(newTimer.current); newTimer.current = setTimeout(() => setNewRow(null), TOAST_MS) }
        }
        toast(r.msg); return r.ok
      },
      removeFromDeck(id) { const d = rules.removeFromDeck(deckR.current, id); if (d === deckR.current) return; setNewRow(nr => (nr && nr.id === id ? null : nr)); commitDeck(d) },
      setDeck: commitDeck,
      cycleOwn(id) { const c = BYID[id]; if (!c || c.t === 'Ability') return; commitOwn(setOwn(ownR.current, id, nextOwn(ownN(ownR.current, id, BYID), c))) },
      setOwnAll: commitOwn,
      openModal: open,
      pushModal(id) {
        const m = modalR.current; if (!m) { open(id, null); return }
        if (id === m.id) return
        open(id, null, [...m.hist, { id: m.id, list: m.list, scroll: modalScroll() }])
      },
      backModal(lv) {
        const m = modalR.current; if (!m || !m.hist.length) return
        const k = lv === undefined ? m.hist.length - 1 : lv; const t = m.hist[k]; if (!t) return
        open(t.id, t.list, m.hist.slice(0, k), t.scroll)
      },
      closeModal() { modalR.current = null; setModal(null); hidePop() },
      // prev/next in the list does not count as history: keep the stack as it is
      stepModal(d) { const m = modalR.current; if (!m) return; const j = m.idx + d; if (m.idx < 0 || j < 0 || j >= m.list.length) return; open(m.list[j], m.list, m.hist) },
      showTab(t) { setTab(t); if (t === 'cards') setView({ v: 'home' }); scrollTo(0, 0) },
      showCards(v, preset) { setTab('cards'); setView(v); if (preset !== undefined) setAllReq(r => ({ n: r.n + 1, preset })); scrollTo(0, 0) },
      setLang(l) { setLangS(l); storage.saveLang(l) },
      setScraps(v) { setScrapsS(v); storage.saveScraps(v) },
      setCurList(ids) { curList.current = ids },
      getCurList: () => curList.current,
    }
    return a
  }, [])

  // old setLang(LANG) at startup also wrote the key back
  useEffect(() => { storage.saveLang(lang) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // body scroll lock while the modal is open
  useEffect(() => { document.body.style.overflow = modal ? 'hidden' : '' }, [modal])

  // document-level handlers (same order as the old page): keyword buttons open the popover and swallow the click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as Element | null; if (!t || !t.closest) return
      const kb = t.closest<HTMLElement>('.kwb'); if (kb) { e.stopPropagation(); showPop(kb); return }
      if (!t.closest('#pop')) hidePop()
    }
    const onKey = (e: KeyboardEvent) => {
      const m = modalR.current
      if (e.key === 'Escape') { if (isPopOpen()) hidePop(); else if (m) actions.closeModal(); return }
      if (m) {
        const typing = (() => { const ae = document.activeElement as HTMLElement | null; return !!ae && (/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) || ae.isContentEditable) })()
        if (!typing && m.hist.length && ((e.key === 'Backspace' && !e.altKey && !e.ctrlKey && !e.metaKey) || (e.key === 'ArrowLeft' && e.altKey))) { e.preventDefault(); actions.backModal(); return }
        if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return
        if (e.key === 'ArrowRight') actions.stepModal(1); else if (e.key === 'ArrowLeft') actions.stepModal(-1); return }
      const ae = document.activeElement as HTMLElement | null
      if (e.key === 'Enter') { const card = ae?.closest?.<HTMLElement>('#grid .gc'); if (card && ae === card) actions.openModal(+card.dataset.id!, curList.current); return }
      // "/" jumps to the search box of the page that is showing (not while typing somewhere)
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !(ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName))) {
        const q = document.querySelector<HTMLInputElement>('section.page:not(.hidden) .search input'); if (q) { e.preventDefault(); q.focus(); q.select() }
      }
    }
    document.addEventListener('click', onClick, true)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('click', onClick, true); document.removeEventListener('keydown', onKey) }
  }, [actions])

  const state = useMemo<AppState>(() => ({ lang, tab, view, allReq, recent, deck, own, stars, scraps, newRow }), [lang, tab, view, allReq, recent, deck, own, stars, scraps, newRow])
  const gridPage: GridPage | null = (tab === 'cards' && view.v === 'all') || tab === 'coll' || tab === 'stars' ? tab : null
  const lastGrid = useRef<GridPage>('cards'); if (gridPage) lastGrid.current = gridPage
  const toggleSide = () => setCollapsed(v => { storage.saveSide(!v); return !v })

  return (
    <ActionsCtx.Provider value={actions}>
      <StateCtx.Provider value={state}>
        <div className={'app' + (collapsed ? ' collapsed' : '')} id="app">
          <Sidebar collapsed={collapsed} onToggle={toggleSide} />
          <main className="main">
            <MobileHead />
            {tab === 'cards' && view.v === 'home' && <CardsHome />}
            {tab === 'cards' && view.v === 'fac' && <FactionPage key={view.f} f={view.f} to={view.to} />}
            <CardsPage page={lastGrid.current} hidden={!gridPage} />
            <DeckTab hidden={tab !== 'deck'} />
            <Overview hidden={tab !== 'ov'} />
            <SiteFooter />
          </main>
        </div>
        <BottomNav />
        <CardModal modal={modal} />
        <KeywordPopover />
        <Toast />
      </StateCtx.Provider>
    </ActionsCtx.Provider>
  )
}
