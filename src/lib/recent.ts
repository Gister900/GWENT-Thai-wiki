/** cards home: "ดูล่าสุด" row keeps the last 20 cards opened in the modal (localStorage gwent-recent) */
export const RECENT_MAX = 20

/** put id first, drop its older copy, keep at most max ids */
export function pushRecent(list: number[], id: number, max = RECENT_MAX): number[] {
  if (list[0] === id) return list
  return [id, ...list.filter(x => x !== id)].slice(0, max)
}
