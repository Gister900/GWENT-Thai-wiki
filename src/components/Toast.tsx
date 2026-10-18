import { useSyncExternalStore } from 'react'
import { TOAST_MS } from '../lib/constants'

let state = { msg: '', visible: false }
const subs = new Set<() => void>()
let timer: ReturnType<typeof setTimeout> | undefined
const emit = () => subs.forEach(f => f())

/** show a message at the bottom for 2.6 s (a new message replaces the old one) */
export function toast(msg: string) {
  state = { msg, visible: true }; emit()
  clearTimeout(timer); timer = setTimeout(() => { state = { ...state, visible: false }; emit() }, TOAST_MS)
}

export function Toast() {
  const s = useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f) }, () => state)
  return <div className={'toast' + (s.visible ? '' : ' hidden')} id="toast" role="status">{s.msg}</div>
}
