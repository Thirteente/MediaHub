import { readFileSync, statSync } from 'node:fs'

const catalog = JSON.parse(readFileSync(new URL('../src/data/catalog.json', import.meta.url), 'utf8'))
const publicDirectory = new URL('../public/', import.meta.url)
const mediaDirectory = new URL('media/', publicDirectory)
const entries = catalog.flatMap((work) =>
  work.type === 'movie'
    ? [{ title: work.title, media: work.media }]
    : work.seasons.flatMap((season) =>
        season.episodes.map((episode) => ({
          title: `${work.title} 第 ${season.number} 季第 ${episode.number} 集`,
          media: episode.media,
        })),
      ),
)

async function checkMedia({ title, media }) {
  if (media.url.startsWith('https://')) {
    try {
      const response = await fetch(media.url, {
        headers: { Range: 'bytes=0-0' },
        signal: AbortSignal.timeout(12000),
      })
      const type = response.headers.get('content-type')?.split(';', 1)[0]
      const range = response.headers.get('content-range') ?? ''
      await response.body?.cancel()
      if (response.status !== 206 || type !== media.mimeType || !/^bytes 0-0\/[1-9]\d*$/.test(range)) {
        console.error(`[在线片源异常] ${title} · HTTP ${response.status} · ${type ?? '未知类型'}`)
        return false
      }
      console.log(`[在线就绪] ${title} · 支持进度跳转`)
      return true
    } catch (error) {
      console.error(`[在线片源不可达] ${title} · ${error.message}`)
      return false
    }
  }

  const file = new URL('.' + media.url, publicDirectory)
  if (!media.url.startsWith('/media/') || !file.href.startsWith(mediaDirectory.href)) {
    console.error(`[路径无效] ${title} · ${media.url}`)
    return false
  }

  const stat = statSync(file, { throwIfNoEntry: false })
  if (!stat?.isFile() || stat.size === 0) {
    console.error(`[缺失或为空] ${title} · public${media.url}`)
    return false
  }

  console.log(`[本地就绪] ${title} · ${(stat.size / 1024 ** 2).toFixed(1)} MiB`)
  return true
}

const results = await Promise.all(entries.map(checkMedia))
const available = results.filter(Boolean).length
console.log(`片源就绪 ${available}/${entries.length}。`)
if (available !== entries.length) {
  console.error('片源出处和本地样片说明见 docs/media-sources.md。')
  process.exitCode = 1
}
