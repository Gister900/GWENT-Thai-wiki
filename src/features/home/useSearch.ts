import { useEffect, useRef, useState } from 'react'
import { DEBOUNCE_MS } from '../../lib/constants'
import { normQuery } from '../../lib/search'

/** search box text + debounced query (same normalisation and delay as the all-cards search) · clearing applies at once */
export function useSearch() {
  const [text, setText] = useState(''), [q, setQ] = useState('')
  const t = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(t.current), [])
  const onText = (v: string) => {
    setText(v); clearTimeout(t.current)
    const n = normQuery(v); if (!n) setQ(''); else t.current = setTimeout(() => setQ(n), DEBOUNCE_MS)
  }
  return { text, q, onText }
}
