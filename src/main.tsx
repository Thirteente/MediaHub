import { StrictMode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Link, Route, Routes, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { contentById, orderedSeasons, searchCatalog, workById, works } from './catalog'
import type { Playable, Work } from './catalog'
import { Player } from './Player'
import { readProgress } from './progress'
import './styles.css'

function titlePath(id: string) {
  return '/title/' + encodeURIComponent(id)
}

function watchPath(id: string) {
  return '/watch/' + encodeURIComponent(id)
}

function useLibraryPath() {
  const { state } = useLocation()
  return typeof state?.libraryPath === 'string' ? state.libraryPath : '/'
}

function Cover({ work, backdrop = false }: { work: Work; backdrop?: boolean }) {
  const image = (backdrop && work.backdrop) || work.poster
  return <div className="cover">{image && <img src={image} alt="" />}</div>
}

function WorkMeta({ work }: { work: Work }) {
  return (
    <p className="meta">
      {[
        work.type === 'movie' ? '电影' : '剧集',
        work.year,
        work.genre,
        work.type === 'movie'
          ? work.durationMinutes && `${work.durationMinutes} 分钟`
          : `${work.seasons.reduce((total, season) => total + season.episodes.length, 0)} 集`,
      ].filter(Boolean).join(' · ')}
    </p>
  )
}

function TitleActions({ work, libraryPath }: { work: Work; libraryPath: string }) {
  if (work.type !== 'movie') return null

  return (
    <Link className="button button-primary" to={watchPath(work.id)} state={{ libraryPath }}>
      <span className="play-mark" aria-hidden="true" /> 立即观看
    </Link>
  )
}

function Featured({ work }: { work: Work }) {
  return (
    <section className="featured" aria-labelledby="featured-title">
      <Cover work={work} backdrop />
      <div className="featured-copy">
        <p className="section-label">本次推荐</p>
        <h1 id="featured-title">{work.title}</h1>
        {work.originalTitle !== work.title && <p className="original-title">{work.originalTitle}</p>}
        <WorkMeta work={work} />
        <p className="summary">{work.summary}</p>
        <div className="actions">
          <TitleActions work={work} libraryPath="/" />
          <Link className="button button-quiet" to={titlePath(work.id)}>影片详情</Link>
        </div>
      </div>
    </section>
  )
}

function ContinueWatching() {
  const [recent, setRecent] = useState(readProgress)
  useEffect(() => setRecent(readProgress()), [])
  const content = recent && contentById.get(recent.contentId)
  if (!recent || !content) return null

  const percent = Math.floor((recent.currentTime / recent.duration) * 100)
  const minutes = Math.floor(recent.currentTime / 60)
  const seconds = String(Math.floor(recent.currentTime % 60)).padStart(2, '0')
  const image = content.episode?.thumbnail || content.work.poster

  return (
    <section className="shelf" aria-labelledby="recent-title">
      <h2 id="recent-title">继续观看</h2>
      <Link className="recent-card" to={watchPath(content.id)} state={{ resume: true }}>
        <div className="cover">{image && <img src={image} alt="" />}</div>
        <div className="recent-copy">
          <strong>{content.work.title}{content.episode && ` · 第 ${content.episode.number} 集`}</strong>
          <span className="meta">已播放 {minutes}:{seconds}</span>
          <progress aria-label="观看进度" value={percent} max={100} />
        </div>
        <span className="play-mark" aria-hidden="true" />
      </Link>
    </section>
  )
}

const categories = [
  { title: '全部', value: '' },
  { title: '电影', value: 'movie' },
  { title: '剧集', value: 'series' },
]

function Library() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const type = params.get('type') ?? ''
  const activeType = categories.some((category) => category.value === type) ? type : ''
  const results = searchCatalog(query).filter((work) => !activeType || work.type === activeType)
  const featured = workById.get('tears-of-steel') ?? works[0]
  const home = !query.trim() && !activeType
  const libraryPath = params.size ? '/?' + params : '/'

  function updateParam(name: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(name, value)
    else next.delete(name)
    setParams(next, { replace: true })
  }

  return (
    <>
      {home && featured && <Featured work={featured} />}
      {home && <ContinueWatching />}
      <section className="shelf" aria-labelledby="catalog-title">
        <div className="shelf-heading">
          <div>
            {home && featured
              ? <h2 id="catalog-title">浏览片库</h2>
              : <h1 id="catalog-title">{query.trim() ? '搜索结果' : '浏览片库'}</h1>}
          </div>
          <div className="search" role="search">
            <label className="visually-hidden" htmlFor="search">搜索片名</label>
            <span className="search-mark" aria-hidden="true" />
            <input
              id="search" type="search" placeholder="搜索片名" value={query}
              onChange={(event) => updateParam('q', event.currentTarget.value)}
            />
          </div>
        </div>
        <div className="shelf-toolbar">
          <div className="filters" role="group" aria-label="作品类型">
            {categories.map((category) => (
              <button key={category.value} type="button" aria-pressed={activeType === category.value}
                onClick={() => updateParam('type', category.value)}>
                {category.title}
              </button>
            ))}
          </div>
          <p className="meta" role="status">{results.length} 部作品</p>
        </div>
        {results.length === 0 ? (
          <div className="empty">
            <p>没有找到匹配的影片。</p>
            <button className="button" type="button" onClick={() => setParams({}, { replace: true })}>重置筛选</button>
          </div>
        ) : (
          <ul className="work-grid">
            {results.map((work) => (
              <li key={work.id}>
                <Link className="work-card" to={titlePath(work.id)} state={{ libraryPath }}>
                  <Cover work={work} />
                  <div className="work-card-body">
                    <div>
                      <h3>{work.title}</h3>
                      <WorkMeta work={work} />
                    </div>
                    <span className="card-arrow" aria-hidden="true">↗</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

function Missing({ title }: { title: string }) {
  const libraryPath = useLibraryPath()
  return (
    <div className="empty">
      <h1>{title}</h1>
      <Link className="button" to={libraryPath}>返回片库</Link>
    </div>
  )
}

function EpisodeList({ work, activeId }: { work: Extract<Work, { type: 'series' }>; activeId?: string }) {
  const libraryPath = useLibraryPath()

  return (
    <section className="episodes" aria-labelledby="episodes-title">
      <h2 id="episodes-title">选集</h2>
      {orderedSeasons(work).map((season) => (
        <div className="season" key={season.number}>
          <h3>第 {season.number} 季</h3>
          <ul className="episode-list">
            {season.episodes.map((episode) => (
              <li key={episode.id}>
                <Link className="episode-link" to={watchPath(episode.id)} state={{ libraryPath }}
                  aria-current={activeId === episode.id ? 'page' : undefined}>
                  <div className="cover">{episode.thumbnail && <img src={episode.thumbnail} alt="" />}</div>
                  <div className="episode-copy">
                    <span className="meta">第 {episode.number} 集</span>
                    <strong>{episode.title}</strong>
                    {activeId === episode.id && <span className="current-episode">当前剧集</span>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}

function TitlePage() {
  const { workId } = useParams()
  const libraryPath = useLibraryPath()
  const work = workById.get(workId ?? '')

  if (!work) return <Missing title="找不到这部影片" />

  return (
    <>
      <Link className="back" to={libraryPath}>← 返回片库</Link>
      <section className="featured featured-detail" aria-labelledby="detail-title">
        <Cover work={work} backdrop />
        <div className="featured-copy">
          <WorkMeta work={work} />
          <h1 id="detail-title">{work.title}</h1>
          {work.title !== work.originalTitle && <p className="original-title">{work.originalTitle}</p>}
          <p className="summary">{work.summary}</p>
          <TitleActions work={work} libraryPath={libraryPath} />
          {work.artworkCredit && (
            <p className="artwork-credit"><a href={work.artworkCredit}>剧照来源与授权</a></p>
          )}
        </div>
      </section>
      {work.type === 'series' && <EpisodeList work={work} />}
    </>
  )
}

function Watch({ content }: { content: Playable }) {
  const libraryPath = useLibraryPath()
  const { state } = useLocation()
  const title = content.episode?.title ?? content.work.title
  const recent = state?.resume === true ? readProgress() : null
  const resumeAt = recent?.contentId === content.id ? recent.currentTime : 0

  return (
    <>
      <Link className="back" to={titlePath(content.work.id)} state={{ libraryPath }}>← 返回详情</Link>
      <div className={content.episode ? 'watch watch-series' : 'watch'}>
        <div className="watch-main">
          <div className="watch-head">
            <div>
              {content.episode && (
                <p className="meta">{content.work.title} · 第 {content.season} 季 · 第 {content.episode.number} 集</p>
              )}
              <h1>{title}</h1>
            </div>
            {content.next && (
              <Link className="button" to={watchPath(content.next.id)} state={{ libraryPath }}>下一集 →</Link>
            )}
          </div>
          <Player content={content} title={title} resumeAt={resumeAt} />
        </div>
        {content.work.type === 'series' && <EpisodeList work={content.work} activeId={content.id} />}
      </div>
    </>
  )
}

function WatchPage() {
  const { contentId } = useParams()
  const { key } = useLocation()
  const content = contentById.get(contentId ?? '')
  return content ? <Watch key={key} content={content} /> : <Missing title="找不到这个播放条目" />
}

function App() {
  const { pathname } = useLocation()
  const main = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    main.current?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <>
      <header className="site-header">
        <div className="shell header-inner">
          <Link className="wordmark" to="/"><span className="brand-mark" aria-hidden="true" />Media<span>Hub</span></Link>
          <nav aria-label="主导航"><Link className="header-link" to="/" aria-current={pathname === '/' ? 'page' : undefined}>片库</Link></nav>
        </div>
      </header>
      <main className="shell" ref={main} tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Library />} />
          <Route path="/title/:workId" element={<TitlePage />} />
          <Route path="/watch/:contentId" element={<WatchPage />} />
          <Route path="*" element={<Missing title="找不到这个页面" />} />
        </Routes>
      </main>
      <footer className="shell site-footer">
        <a href="https://studio.blender.org/films/">剧照与视频源自 Blender 开放电影项目</a>
      </footer>
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><HashRouter><App /></HashRouter></StrictMode>,
)
