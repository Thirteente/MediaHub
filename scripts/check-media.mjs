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

let available = 0
for (const { title, media } of entries) {
  const file = new URL('.' + media.url, publicDirectory)
  if (!media.url.startsWith('/media/') || !file.href.startsWith(mediaDirectory.href)) {
    console.error(`[路径无效] ${title} · ${media.url}`)
    continue
  }

  const stat = statSync(file, { throwIfNoEntry: false })
  if (!stat?.isFile() || stat.size === 0) {
    console.error(`[缺失或为空] ${title} · public${media.url}`)
    continue
  }

  available += 1
  console.log(`[已就绪] ${title} · ${(stat.size / 1024 ** 2).toFixed(1)} MiB`)
}

console.log(`媒体文件就绪 ${available}/${entries.length}。`)
if (available !== entries.length) {
  console.error('下载和放置方法见 docs/media-sources.md。')
  process.exitCode = 1
}
