import { contentById } from './catalog'

const storageKey = 'mediahub:recent-playback'
const progressPrefix = 'mediahub:playback:'

type Progress = { contentId: string; currentTime: number; duration: number; updatedAt: number }

function parseProgress(raw: string | null): Progress | null {
  try {
    const value = JSON.parse(raw ?? 'null')
    if (
      value && contentById.has(value.contentId) &&
      Number.isFinite(value.currentTime) && Number.isFinite(value.duration) &&
      value.currentTime > 0 && value.duration > value.currentTime
    ) {
      const { contentId, currentTime, duration, updatedAt } = value
      return { contentId, currentTime, duration, updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0 }
    }
  } catch {
    // A malformed entry should not affect the other saved items.
  }
  return null
}

export function readProgress(contentId: string): Progress | null {
  try {
    const saved = parseProgress(localStorage.getItem(progressPrefix + contentId))
    if (saved?.contentId === contentId) return saved

    const legacy = parseProgress(localStorage.getItem(storageKey))
    return legacy?.contentId === contentId ? legacy : null
  } catch {
    return null
  }
}

export function listProgress() {
  const entries: Progress[] = []
  try {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith(progressPrefix)) continue
      const progress = parseProgress(localStorage.getItem(key))
      if (progress && key === progressPrefix + progress.contentId) entries.push(progress)
    }

    const legacy = parseProgress(localStorage.getItem(storageKey))
    if (legacy && !entries.some((progress) => progress.contentId === legacy.contentId)) {
      entries.push(legacy)
    }
  } catch {
    // Playback remains available when browser storage is disabled.
  }
  return entries.sort((a, b) => b.updatedAt - a.updatedAt)
}

export function saveProgress(contentId: string, currentTime: number, duration: number) {
  if (!Number.isFinite(currentTime) || !Number.isFinite(duration) || currentTime <= 0 || duration <= 0) return

  try {
    const key = progressPrefix + contentId
    if (currentTime >= duration - 1) {
      localStorage.removeItem(key)
    } else {
      const progress: Progress = { contentId, currentTime, duration, updatedAt: Date.now() }
      localStorage.setItem(key, JSON.stringify(progress))
    }

    if (parseProgress(localStorage.getItem(storageKey))?.contentId === contentId) {
      localStorage.removeItem(storageKey)
    }
  } catch {
    // Browser storage is optional.
  }
}
