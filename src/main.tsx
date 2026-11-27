import { StrictMode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Link, Route, Routes, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { contentById, orderedSeasons, searchCatalog, workById, works } from './catalog'
import type { Playable, Work } from './catalog'
import { Player } from './Player'
import { listProgress, readProgress } from './progress'
import { readWatchlist, updateWatchlist } from './watchlist'
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

function WatchlistButton({
  saved,
  onToggle,
}: {
  saved: boolean
  onToggle: () => boolean
}) {
  const [failed, setFailed] = useState(false)

  return (
    <div className="watchlist-control">
      <button className="button button-quiet watchlist-button" type="button"
        aria-label="想看" aria-pressed={saved} onClick={() => setFailed(!onToggle())}>
        <span aria-hidden="true">{saved ? '✓ 已加入想看' : '＋ 加入想看'}</span>
      </button>
      {failed && <p role="alert">浏览器无法保存片单，请检查存储设置。</p>}
    </div>
  )
}

function Featured({ work, saved, toggle }: { work: Work; saved: boolean; toggle: () => boolean }) {
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
          <WatchlistButton saved={saved} onToggle={toggle} />
        </div>
      </div>
    </section>
  )
}

function ContinueWatching() {
  const [items, setItems] = useState(listProgress)
  useEffect(() => {
    const refresh = () => setItems(listProgress())
    refresh()
    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
  }, [])

  if (items.length === 0) return null

  return (
    <section className="shelf" aria-labelledby="recent-title">
      <h2 id="recent-title">继续观看</h2>
      <ul className="recent-list">
        {items.map((recent) => {
          const content = contentById.get(recent.contentId)
          if (!content) return null

          const minutes = Math.floor(recent.currentTime / 60)
          const seconds = String(Math.floor(recent.currentTime % 60)).padStart(2, '0')
          const image = content.episode?.thumbnail || content.work.poster

          return (
            <li key={content.id}>
              <Link className="recent-card" to={watchPath(content.id)} state={{ resume: true }}>
                <div className="cover">{image && <img src={image} alt="" />}</div>
                <div className="recent-copy">
                  <strong>{content.work.title}{content.episode && ` · 第 ${content.episode.number} 集`}</strong>
                  <span className="meta">已播放 {minutes}:{seconds}</span>
                  <progress aria-label="观看进度" value={recent.currentTime} max={recent.duration} />
                </div>
                <span className="play-mark" aria-hidden="true" />
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

const categories = [
  { title: '全部', value: '' },
  { title: '电影', value: 'movie' },
  { title: '剧集', value: 'series' },
]

function WorkGrid({
  items,
  libraryPath,
  headingLevel = 'h3',
}: {
  items: Work[]
  libraryPath: string
  headingLevel?: 'h2' | 'h3'
}) {
  const Heading = headingLevel
  return (
    <ul className="work-grid">
      {items.map((work) => (
        <li key={work.id}>
          <Link className="work-card" to={titlePath(work.id)} state={{ libraryPath }}>
            <Cover work={work} />
            <div className="work-card-body">
              <div>
                <Heading>{work.title}</Heading>
                <WorkMeta work={work} />
              </div>
              <span className="card-arrow" aria-hidden="true">↗</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function WatchlistPage({ savedIds }: { savedIds: string[] }) {
  const items = savedIds.flatMap((id) => {
    const work = workById.get(id)
    return work ? [work] : []
  })

  return (
    <section className="shelf" aria-labelledby="watchlist-title">
      <div className="shelf-heading">
        <h1 id="watchlist-title">想看</h1>
      </div>
      {items.length > 0 ? (
        <WorkGrid items={items} libraryPath="/watchlist" headingLevel="h2" />
      ) : (
        <div className="empty">
          <p>片单还是空的。打开影片详情，选择「加入想看」。</p>
          <Link className="button" to="/">浏览片库</Link>
        </div>
      )}
    </section>
  )
}

function Library({ savedIds, toggle }: { savedIds: string[]; toggle: (id: string) => boolean }) {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const searchInput = useRef<HTMLInputElement>(null)
  const composing = useRef(false)

  useLayoutEffect(() => {
    const input = searchInput.current
    if (input && !composing.current && input.value !== query) input.value = query
  }, [query])

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
      {home && featured && <Featured key={featured.id} work={featured} saved={savedIds.includes(featured.id)} toggle={() => toggle(featured.id)} />}
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
              ref={searchInput}
              id="search"
              type="search"
              placeholder="搜索片名"
              defaultValue={query}
              onCompositionStart={() => { composing.current = true }}
              onCompositionEnd={(event) => {
                composing.current = false
                const value = event.currentTarget.value
                if (value !== query) updateParam('q', value)
              }}
              onChange={(event) => {
                // Let the input method own provisional text until the user chooses a candidate.
                if (composing.current || (event.nativeEvent as InputEvent).isComposing) return
                const value = event.currentTarget.value
                if (value !== query) updateParam('q', value)
              }}
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
          <WorkGrid items={results} libraryPath={libraryPath} />
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

function TitlePage({ savedIds, toggle }: { savedIds: string[]; toggle: (id: string) => boolean }) {
  const { workId } = useParams()
  const libraryPath = useLibraryPath()
  const work = workById.get(workId ?? '')

  if (!work) return <Missing title="找不到这部影片" />

  return (
    <>
      <Link className="back" to={libraryPath}>← {libraryPath === "/watchlist" ? "返回想看" : "返回片库"}</Link>
      <section className="featured featured-detail" aria-labelledby="detail-title">
        <Cover work={work} backdrop />
        <div className="featured-copy">
          <WorkMeta work={work} />
          <h1 id="detail-title">{work.title}</h1>
          {work.title !== work.originalTitle && <p className="original-title">{work.originalTitle}</p>}
          <p className="summary">{work.summary}</p>
          <div className="actions">
            <TitleActions work={work} libraryPath={libraryPath} />
            <WatchlistButton key={work.id} saved={savedIds.includes(work.id)} onToggle={() => toggle(work.id)} />
          </div>
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
  const resumeAt = state?.resume === true ? readProgress(content.id)?.currentTime ?? 0 : 0

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
  const [savedIds, setSavedIds] = useState(readWatchlist)

  useEffect(() => {
    const refresh = () => setSavedIds(readWatchlist())
    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
  }, [])

  function toggle(id: string) {
    const next = updateWatchlist(id)
    if (next === null) return false
    setSavedIds(next)
    return true
  }

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    main.current?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <>
      <header className="site-header">
        <div className="shell header-inner">
          <Link className="wordmark" to="/"><span className="brand-mark" aria-hidden="true" />Media<span>Hub</span></Link>
          <nav className="header-nav" aria-label="主导航">
            <Link className="header-link" to="/" aria-current={pathname === '/' ? 'page' : undefined}>片库</Link>
            <Link className="header-link" to="/watchlist" aria-current={pathname === '/watchlist' ? 'page' : undefined}>想看</Link>
          </nav>
        </div>
      </header>
      <main className="shell" ref={main} tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Library savedIds={savedIds} toggle={toggle} />} />
          <Route path="/watchlist" element={<WatchlistPage savedIds={savedIds} />} />
          <Route path="/title/:workId" element={<TitlePage savedIds={savedIds} toggle={toggle} />} />
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
