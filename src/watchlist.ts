import { workById } from './catalog'

const prefix = 'mediahub:watchlist:'

export function readWatchlist(): string[] {
  try {
    const entries = []
    for (const id of workById.keys()) {
      const saved = localStorage.getItem(prefix + id)
      if (saved === null) continue
      const addedAt = Number(saved)
      if (Number.isFinite(addedAt) && addedAt > 0) entries.push({ id, addedAt })
    }
    return entries.sort((a, b) => b.addedAt - a.addedAt).map(({ id }) => id)
  } catch {
    return []
  }
}

export function updateWatchlist(id: string): string[] | null {
  try {
    const key = prefix + id
    if (readWatchlist().includes(id)) localStorage.removeItem(key)
    else localStorage.setItem(key, String(Date.now()))
    return readWatchlist()
  } catch {
    return null
  }
}
