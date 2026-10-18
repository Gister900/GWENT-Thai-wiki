export const FAC: Record<string, { th: string; ab: string; cls: string }> = {
  'Monster': { th: 'Monsters', ab: 'M', cls: 'Monster' },
  'Nilfgaard': { th: 'Nilfgaard', ab: 'Ni', cls: 'Nilfgaard' },
  'Northern Realms': { th: 'Northern Realms', ab: 'NR', cls: 'NorthernRealms' },
  'Scoiatael': { th: "Scoia'tael", ab: 'ST', cls: 'Scoiatael' },
  'Skellige': { th: 'Skellige', ab: 'Sk', cls: 'Skellige' },
  'Syndicate': { th: 'Syndicate', ab: 'Sy', cls: 'Syndicate' },
  'Neutral': { th: 'Neutral', ab: 'N', cls: 'Neutral' },
}
export const FAC_ORDER = Object.keys(FAC)

export const COL: Record<string, { t: string; i: string }> = { 'Bronze': { t: 'Bronze', i: '●' }, 'Gold': { t: 'Gold', i: '◆' }, 'Leader': { t: 'Leader', i: '♛' } }
export const RAR: Record<string, string> = { 'Common': 'Common', 'Rare': 'Rare', 'Epic': 'Epic', 'Legendary': 'Legendary' }

export const TOAST_MS = 2600
export const DEBOUNCE_MS = 120
