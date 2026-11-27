import { useEffect, useRef, useState } from 'react'
import type { Playable } from './catalog'
import { saveProgress } from './progress'

export type PlaybackState = 'loading' | 'ready' | 'playing' | 'paused' | 'ended' | 'error'

export type PlaybackSnapshot = {
  contentId: string
  mediaUrl: string
  currentTime: number
  state: PlaybackState
}

export function Player({
  content,
  title,
  resumeAt,
}: {
  content: Playable
  title: string
  resumeAt: number
}) {
  const online = content.media.url.startsWith('https://')
  const videoRef = useRef<HTMLVideoElement>(null)
  const hasPlayed = useRef(false)
  const lastSave = useRef(0)
  const [playback, setPlayback] = useState<PlaybackSnapshot>(() => ({
    contentId: content.id,
    mediaUrl: new URL(content.media.url, window.location.href).href,
    currentTime: 0,
    state: 'loading',
  }))

  useEffect(() => {
    const video = videoRef.current
    function flush() {
      if (video && hasPlayed.current && !video.error) {
        saveProgress(content.id, video.currentTime, video.duration)
      }
    }
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [content.id])

  function report(video: HTMLVideoElement, state?: PlaybackState) {
    const currentTime = video.currentTime
    setPlayback((previous) => ({
      ...previous,
      currentTime,
      state: state ?? previous.state,
    }))
  }

  function checkpoint(video: HTMLVideoElement) {
    if (hasPlayed.current && !video.error) {
      saveProgress(content.id, video.currentTime, video.duration)
      lastSave.current = Date.now()
    }
  }

  function retry() {
    const video = videoRef.current
    if (video) {
      video.load()
      report(video, 'loading')
    }
  }

  return (
    <>
      <video
        ref={videoRef}
        aria-label={title}
        controls
        playsInline
        preload="metadata"
        src={playback.mediaUrl}
        poster={content.episode?.thumbnail || content.work.poster}
        onLoadStart={(event) => report(event.currentTarget, 'loading')}
        onLoadedMetadata={(event) => {
          const video = event.currentTarget
          if (resumeAt > 0 && resumeAt < video.duration - 1) video.currentTime = resumeAt
          report(video, 'ready')
        }}
        onPlaying={(event) => {
          hasPlayed.current = true
          report(event.currentTarget, 'playing')
          checkpoint(event.currentTarget)
        }}
        onPause={(event) => {
          const video = event.currentTarget
          if (!video.ended && !video.error && video.readyState > 0) {
            report(video, 'paused')
            checkpoint(video)
          }
        }}
        onEnded={(event) => {
          report(event.currentTarget, 'ended')
          checkpoint(event.currentTarget)
        }}
        onSeeked={(event) => checkpoint(event.currentTarget)}
        onTimeUpdate={(event) => {
          report(event.currentTarget)
          if (Date.now() - lastSave.current >= 1000) checkpoint(event.currentTarget)
        }}
        onError={(event) => report(event.currentTarget, 'error')}
      />
      {playback.state === 'error' && (
        <div className="playback-error">
          <p role="alert">
            {online ? '在线片源暂时无法播放。请检查网络连接后重试。' : '视频暂时无法播放。请检查媒体文件和网络连接。'}
          </p>
          <button className="button" type="button" onClick={retry}>重试</button>
        </div>
      )}
      <p className="credits">
        {content.media.credit} · <a href={content.media.sourceUrl}>片源</a> ·{' '}
        <a href={content.media.licenseUrl}>授权协议</a>
        {!online && <> · <a href={content.media.url}>直接打开视频</a></>}
        {content.media.changes && ` · ${content.media.changes}`}
      </p>
    </>
  )
}
