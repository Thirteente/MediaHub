import { contentById } from './catalog'

const storageKey = 'mediahub:recent-playback'

type Progress = { contentId: string; currentTime: number; duration: number }

export function readProgress(): Progress | null {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
    if (
      value && contentById.has(value.contentId) &&
      Number.isFinite(value.currentTime) && Number.isFinite(value.duration) &&
      value.currentTime > 0 && value.duration > value.currentTime
    ) return value
  } catch {
    // Playback remains available when browser storage is disabled or unreadable.
  }
  return null
}

export function saveProgress(contentId: string, currentTime: number, duration: number) {
  if (!Number.isFinite(duration) || duration <= 0) return

  try {
    if (currentTime >= duration - 1) {
      if (readProgress()?.contentId === contentId) localStorage.removeItem(storageKey)
    } else if (currentTime > 0) {
      const progress: Progress = { contentId, currentTime, duration }
      localStorage.setItem(storageKey, JSON.stringify(progress))
    }
  } catch {
    // Browser storage is optional.
  }
}
