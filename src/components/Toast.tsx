import { useSyncExternalStore } from 'react'
import { TOAST_MS } from '../lib/constants'

let state = { msg: '', visible: false, err: false }
const subs = new Set<() => void>()
let timer: ReturnType<typeof setTimeout> | undefined
const emit = () => subs.forEach(f => f())

/**
 * show a message at the bottom for 2.6 s (a new message replaces the old one).
 * level 'error' (save failed) wins: while it shows, 'info' messages are dropped, so a "done" message that comes
 * right after a failed save never hides the warning. A new error replaces the old one.
 */
export function toast(msg: string, level: 'info' | 'error' = 'info') {
  if (level === 'info' && state.visible && state.err) return
  state = { msg, visible: true, err: level === 'error' }; emit()
  clearTimeout(timer); timer = setTimeout(() => { state = { ...state, visible: false, err: false }; emit() }, TOAST_MS)
}

export function Toast() {
  const s = useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f) }, () => state)
  return <div className={'toast' + (s.visible ? '' : ' hidden')} id="toast" role="status" data-level={s.err ? 'error' : 'info'}>{s.msg}</div>
}
