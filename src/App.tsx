import { useEffect, useMemo, useRef, useState } from 'react'
import type { Deck, Lang, Own } from './types'
import { ActionsCtx, LangCtx, StateCtx, type Actions, type AppState, type GridPage, type ModalHist, type ModalState, type Tab, type CardsView } from './store'
import { getCard, BYID, META } from './lib/data'
import { UI } from './i18n/ui'
import { TOAST_MS } from './lib/constants'
import * as storage from './lib/storage'
import * as rules from './lib/deckRules'
import { applyOwnOp, applyStarOp, nextOwn, ownN, type OwnOp, type StarOp } from './lib/collection'
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
import { mergeRecent } from './lib/recent'
import { applyDeckOp, keepActive, nextDeckName, newDeckId, showName, type DeckOp, type SavedDeck } from './lib/decks'
import { Pending } from './lib/pending'
import { hasNews, NEWEST } from './content/changelog'
import { GuidePage } from './features/guide/GuidePage'
import { DeckLinkImport } from './features/deck/DeckShare'

export default function App() {
  const [lang, setLangS] = useState<Lang>(storage.loadLang)
  const [tab, setTab] = useState<Tab>('cards')
  const [view, setView] = useState<CardsView>({ v: 'home' })
  const [allReq, setAllReq] = useState<AppState['allReq']>({ n: 0, preset: null })
  const [recent, setRecentS] = useState<number[]>(storage.loadRecent)
  const [scraps, setScrapsS] = useState(() => storage.loadScraps() ?? '')
  const [collapsed, setCollapsed] = useState(storage.loadSide)
  // decks · collection · stars as stored, plus this tab's changes not saved yet (lib/pending.ts)
  const [sync] = useState(() => {
    const init = storage.loadDecks(storage.loadLang())
    return {
      active: init.active,
      decks: new Pending<SavedDeck[], DeckOp>(init.decks, applyDeckOp),
      own: new Pending<Own, OwnOp>(storage.loadOwn(), applyOwnOp),
      stars: new Pending<Set<number>, StarOp>(storage.loadStars(), applyStarOp),
    }
  })
  const [decks, setDecksS] = useState<SavedDeck[]>(() => sync.decks.value)
  const [activeId, setActiveS] = useState(sync.active)
  const [newsDot, setNewsDot] = useState(() => hasNews(storage.loadSeenLog()))
  const deck: Deck = useMemo(() => { const d = decks.find(x => x.id === activeId) || decks[0]; return { f: d.f, L: d.L, c: d.c } }, [decks, activeId])
  const [own, setOwnS] = useState<Own>(() => sync.own.value)
  const [stars, setStarsS] = useState<Set<number>>(() => sync.stars.value)
  const [newRow, setNewRow] = useState<AppState['newRow']>(null)
  const [modal, setModal] = useState<ModalState | null>(null)

  // refs mirror state so the stable actions always see the latest values synchronously
  const recentR = useRef(recent), langR = useRef(lang)
  langR.current = lang
  const decksR = useRef(decks), activeR = useRef(activeId), deckR = useRef(deck), ownR = useRef(own), starsR = useRef(stars), modalR = useRef(modal)
  const mlist = useRef<number[]>([]), curList = useRef<number[]>([]), newTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  modalR.current = modal

  // the deck list + the deck this tab shows, in state and refs (actions and the storage event both use it)
  const setDecksState = (list: SavedDeck[], active: string) => {
    const d = list.find(x => x.id === active) || list[0]
    decksR.current = list; activeR.current = d.id; deckR.current = { f: d.f, L: d.L, c: d.c }
    setDecksS(list); setActiveS(d.id)
  }

  const actions = useMemo<Actions>(() => {
    // Several tabs share localStorage. Every change is one op (one deck · some cards · one star) applied to the latest
    // stored value through storage.update — never this tab's whole in-memory copy written back over another tab's work.
    // An op that could not be saved stays pending (lib/pending.ts): it stays on screen and is saved with the next change.
    // The open deck is kept per tab (activeR); gwent-deck-active is only the default for the next tab that opens.
    const saved = (ok: boolean) => { if (!ok) toast(UI[langR.current].store.fail, 'error') }
    /** open = id of the deck to show afterwards when it is in the new list (default = the deck this tab shows) */
    const changeDecks = (op: DeckOp, open?: string) => {
      const before = decksR.current, was = activeR.current
      const r = sync.decks.change(op, fn => storage.update(storage.KEYS.decks, fn))
      const active = keepActive(before, r.value, open && r.value.some(x => x.id === open) ? open : was)
      setDecksState(r.value, active); saved(r.ok)
      if (active !== was) saved(storage.saveActiveDeck(active))
    }
    const commitDeck = (d: Deck) => {
      const id = activeR.current
      changeDecks({ t: 'set', id, deck: d, at: Date.now(), src: decksR.current.find(x => x.id === id) })
    }
    const mk = (name: string, d: Deck): SavedDeck => ({ id: newDeckId(), name, f: d.f, L: d.L, c: { ...d.c }, updated: Date.now() })
    const changeOwn = (op: OwnOp) => {
      const r = sync.own.change(op, fn => storage.update(storage.KEYS.own, fn))
      ownR.current = r.value; setOwnS(r.value); saved(r.ok)
    }
    // hist: undefined = fresh open from the page (history cleared) · array = keep/replace the modal history
    const open = (id: number, list: number[] | null, hist?: ModalHist[], scroll = 0) => {
      if (!getCard(id)) return
      if (BYID[id] && recentR.current[0] !== id) {
        const r = storage.update(storage.KEYS.recent, latest => mergeRecent(latest, recentR.current, id)).value
        recentR.current = r; setRecentS(r)
      }
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
      toggleStar(id) {
        // what the user saw decides star/unstar; it is applied to the latest stored stars
        const r = sync.stars.change({ id, on: !starsR.current.has(id) }, fn => storage.update(storage.KEYS.stars, fn))
        starsR.current = r.value; setStarsS(r.value); saved(r.ok)
      },
      addToDeck(id) {
        const r = rules.addToDeck(deckR.current, id, BYID, langR.current); if (!r) return false
        if (r.ok) {
          commitDeck(r.deck)
          if (r.added) { setNewRow({ id, t: Date.now() }); clearTimeout(newTimer.current); newTimer.current = setTimeout(() => setNewRow(null), TOAST_MS) }
        }
        toast(r.msg); return r.ok
      },
      removeFromDeck(id) { const d = rules.removeFromDeck(deckR.current, id); if (d === deckR.current) return; setNewRow(nr => (nr && nr.id === id ? null : nr)); commitDeck(d) },
      setDeck: commitDeck,
      // only this tab's open deck changes: the list is not written
      switchDeck(id) { if (!decksR.current.some(x => x.id === id)) return; setDecksState(decksR.current, id); setNewRow(null); saved(storage.saveActiveDeck(id)) },
      newDeck() { const d = mk(nextDeckName(decksR.current, langR.current), { f: '', L: null, c: {} }); changeDecks({ t: 'add', decks: [d] }, d.id); setNewRow(null) },
      dupDeck(id) {
        const src = decksR.current.find(x => x.id === id); if (!src) return
        const copy = { id: newDeckId(), name: UI[langR.current].decks.copyName(showName(src.name, langR.current)), updated: Date.now() }
        changeDecks({ t: 'dup', id, src, copy }, copy.id)
      },
      renameDeck(id, name) { const n = name.trim().slice(0, 60); if (!n) return; changeDecks({ t: 'rename', id, name: n }) },
      deleteDeck(id) {
        if (!decksR.current.some(x => x.id === id)) return
        changeDecks({ t: 'del', id, fresh: mk(nextDeckName([], langR.current), { f: '', L: null, c: {} }) }); setNewRow(null)
      },
      addDecks(items) {
        if (!items.length) return
        const added = items.reduce<SavedDeck[]>((acc, it) => [...acc, mk(it.name || nextDeckName([...decksR.current, ...acc], langR.current), it.deck)], [])
        changeDecks({ t: 'add', decks: added }, added[0].id); setNewRow(null)
      },
      cycleOwn(id) { const c = BYID[id]; if (!c || c.t === 'Ability') return; changeOwn({ t: 'set', ch: { [id]: nextOwn(ownN(ownR.current, id, BYID), c) } }) },
      setOwnCards(ch) { changeOwn({ t: 'set', ch }) },
      replaceOwn(o) { changeOwn({ t: 'all', own: o }) },
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
      showGuide(anchor) {
        setTab('guide')
        // after the page renders: scroll to the section (or the top)
        setTimeout(() => { const el = anchor ? document.getElementById(anchor) : null; if (el) el.scrollIntoView({ block: 'start' }); else scrollTo(0, 0) }, 30)
      },
      markNewsSeen() { storage.saveSeenLog(NEWEST); setNewsDot(false) },
      showCards(v, preset) { setTab('cards'); setView(v); if (preset !== undefined) setAllReq(r => ({ n: r.n + 1, preset })); scrollTo(0, 0) },
      setLang(l) { setLangS(l); storage.saveLang(l) },
      setScraps(v) { setScrapsS(v); storage.update(storage.KEYS.scraps, () => v) },
      setCurList(ids) { curList.current = ids },
      getCurList: () => curList.current,
    }
    return a
  }, [])

  // a guide anchor in the address (#g-deck, #whatsnew …) opens the guide at that section
  useEffect(() => {
    const go = () => { const h = location.hash.slice(1); if (/^(g-[a-z]+|whatsnew)$/.test(h)) actions.showGuide(h) }
    go(); addEventListener('hashchange', go); return () => removeEventListener('hashchange', go)
  }, [actions])

  // another tab changed decks / collection / stars: show its version, with this tab's unsaved changes on top, right away
  // (the event never fires in the tab that wrote). Each key is followed on its own; key null = localStorage.clear().
  // gwent-deck-active from another tab is not followed: each tab keeps the deck it shows, unless that deck was deleted.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      const k = e.key
      if (k === null || k === storage.KEYS.decks) {
        // missing / unreadable / empty list: keep the decks this tab has (there is always at least one)
        const list = sync.decks.stored(storage.readDecks())
        const was = activeR.current, active = keepActive(decksR.current, list, was)
        if (active !== was) {
          const l = langR.current, gone = decksR.current.find(x => x.id === was), now = list.find(x => x.id === active)!
          toast(UI[l].decks.goneElsewhere(showName(gone?.name || '', l), showName(now.name, l))); setNewRow(null)
        }
        setDecksState(list, active)
      }
      if (k === null || k === storage.KEYS.own) { const o = sync.own.stored(storage.readOwn()); ownR.current = o; setOwnS(o) }
      if (k === null || k === storage.KEYS.stars) { const s = sync.stars.stored(storage.readStars()); starsR.current = s; setStarsS(s) }
    }
    addEventListener('storage', onStorage); return () => removeEventListener('storage', onStorage)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // old setLang(LANG) at startup also wrote the key back
  useEffect(() => { storage.saveLang(lang) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // page language, <title> and meta description follow the language switch
  useEffect(() => {
    const T = UI[lang].meta; document.documentElement.lang = lang; document.title = T.title(META.ver)
    document.querySelector('meta[name=description]')?.setAttribute('content', T.desc)
  }, [lang])

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

  const state = useMemo<AppState>(() => ({ lang, tab, view, allReq, recent, deck, decks, activeId, newsDot, own, stars, scraps, newRow }), [lang, tab, view, allReq, recent, deck, decks, activeId, newsDot, own, stars, scraps, newRow])
  const gridPage: GridPage | null = (tab === 'cards' && view.v === 'all') || tab === 'coll' || tab === 'stars' ? tab : null
  const lastGrid = useRef<GridPage>('cards'); if (gridPage) lastGrid.current = gridPage
  const toggleSide = () => setCollapsed(v => { storage.saveSide(!v); return !v })

  return (
    <ActionsCtx.Provider value={actions}>
      <StateCtx.Provider value={state}><LangCtx.Provider value={lang}>
        <div className={'app' + (collapsed ? ' collapsed' : '')} id="app">
          <Sidebar collapsed={collapsed} onToggle={toggleSide} />
          <main className="main">
            <MobileHead />
            {tab === 'cards' && view.v === 'home' && <CardsHome />}
            {tab === 'cards' && view.v === 'fac' && <FactionPage key={view.f} f={view.f} to={view.to} />}
            <CardsPage page={lastGrid.current} hidden={!gridPage} />
            <DeckTab hidden={tab !== 'deck'} />
            <Overview hidden={tab !== 'ov'} />
            {tab === 'guide' && <GuidePage />}
            <SiteFooter />
          </main>
        </div>
        <BottomNav />
        <CardModal modal={modal} />
        <KeywordPopover />
        <DeckLinkImport />
        <Toast />
      </LangCtx.Provider></StateCtx.Provider>
    </ActionsCtx.Provider>
  )
}
