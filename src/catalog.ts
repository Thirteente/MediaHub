import catalog from './data/catalog.json'

type Media = {
  url: string
  mimeType: string
  credit: string
  changes?: string
  sourceUrl: string
  licenseUrl: string
}

type Episode = { id: string; number: number; title: string; thumbnail?: string; media: Media }
type Season = { number: number; episodes: Episode[] }

type WorkInfo = {
  id: string
  title: string
  originalTitle: string
  aliases: string[]
  summary: string
  year?: number
  genre?: string
  durationMinutes?: number
  poster?: string
  backdrop?: string
  artworkCredit?: string
}

type Movie = WorkInfo & { type: 'movie'; media: Media }
type Series = WorkInfo & { type: 'series'; seasons: Season[] }
export type Work = Movie | Series
export type Playable =
  | { id: string; work: Movie; media: Media; episode?: undefined; next?: undefined }
  | { id: string; work: Series; media: Media; episode: Episode; season: number; next?: Episode }

export const works = catalog as Work[]
export const workById = new Map(works.map((work) => [work.id, work]))
export const contentById = new Map<string, Playable>()

export function orderedSeasons(work: Series) {
  return [...work.seasons].sort((a, b) => a.number - b.number).map((season) => ({
    ...season,
    episodes: [...season.episodes].sort((a, b) => a.number - b.number),
  }))
}

for (const work of works) {
  if (work.type === 'movie') {
    contentById.set(work.id, { id: work.id, work, media: work.media })
    continue
  }

  const episodes = orderedSeasons(work).flatMap((season) =>
    season.episodes.map((episode) => ({ episode, season: season.number })),
  )
  episodes.forEach(({ episode, season }, index) => {
    contentById.set(episode.id, {
      id: episode.id, work, media: episode.media, episode, season, next: episodes[index + 1]?.episode,
    })
  })
}

function normalize(value: string) {
  return value.normalize('NFKC').trim().toLowerCase()
}

export function searchCatalog(query: string) {
  const term = normalize(query)
  if (!term) return works

  return works.filter((work) =>
    [work.title, work.originalTitle, ...work.aliases].some((title) => normalize(title).includes(term)),
  )
}
