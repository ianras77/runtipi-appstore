import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  FolderOpen,
  Headphones,
  Music4,
  Play,
  Sparkles
} from 'lucide-react';
import { useLiveJson } from './liveContent';
import { usePageMeta } from './pageMeta';

const MUSIC_LIBRARY_PATH = '/music-library';

type MusicBreadcrumb = {
  label: string;
  path: string;
  url: string;
};

type MusicDirectory = {
  name: string;
  path: string;
  url: string;
};

type MusicTrack = {
  fileName: string;
  title: string;
  path: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  modifiedAt: string;
};

type MusicLibraryResponse = {
  available: boolean;
  currentPath: string;
  title: string;
  pageUrl: string;
  pageAbsoluteUrl: string;
  breadcrumbs: MusicBreadcrumb[];
  directories: MusicDirectory[];
  tracks: MusicTrack[];
  totalDirectories: number;
  totalTracks: number;
  truncated: boolean;
};

function formatBytes(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)} KB`;
  if (sizeBytes < 1024 * 1024 * 1024) return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function readRequestedPath() {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('path')?.trim() ?? '';
}

function buildDirectoryUrl(pathValue: string) {
  return pathValue ? `${MUSIC_LIBRARY_PATH}?path=${encodeURIComponent(pathValue)}` : MUSIC_LIBRARY_PATH;
}

function useRequestedMusicPath() {
  const [requestedPath, setRequestedPath] = useState(() => readRequestedPath());

  useEffect(() => {
    if (typeof window === 'undefined') return () => undefined;

    const syncRequestedPath = () => {
      setRequestedPath(readRequestedPath());
    };

    window.addEventListener('popstate', syncRequestedPath);
    return () => window.removeEventListener('popstate', syncRequestedPath);
  }, []);

  return requestedPath;
}

function useMusicDirectory(pathValue: string) {
  const query = pathValue ? `?path=${encodeURIComponent(pathValue)}` : '';
  return useLiveJson<MusicLibraryResponse>(
    `/api/music-library${query}`,
    'Music library unavailable'
  );
}

export function MusicLibraryPage() {
  const requestedPath = useRequestedMusicPath();
  const { loading, error, data } = useMusicDirectory(requestedPath);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [selectedTrackPath, setSelectedTrackPath] = useState<string | null>(null);
  const [autoplayPending, setAutoplayPending] = useState(false);

  usePageMeta(
    'Listening Room | Rassy',
    'A family listening room for albums, singalongs, and rediscoveries we want to keep close.'
  );

  useEffect(() => {
    if (!data) return;

    setSelectedTrackPath((current) => {
      if (current && data.tracks.some((track) => track.path === current)) {
        return current;
      }
      return data.tracks[0]?.path ?? null;
    });
    setAutoplayPending(false);
  }, [data]);

  const selectedTrack = useMemo(
    () => data?.tracks.find((track) => track.path === selectedTrackPath) ?? data?.tracks[0] ?? null,
    [data, selectedTrackPath]
  );

  useEffect(() => {
    if (!autoplayPending || !audioRef.current) return;

    const player = audioRef.current;
    const play = async () => {
      try {
        await player.play();
      } catch {
        /* browser blocked autoplay */
      } finally {
        setAutoplayPending(false);
      }
    };

    void play();
  }, [autoplayPending, selectedTrack?.url]);

  const parentDirectory = useMemo(() => {
    if (!data?.currentPath) return null;
    const parts = data.currentPath.split('/').filter(Boolean);
    parts.pop();
    const pathValue = parts.join('/');
    return {
      path: pathValue,
      url: buildDirectoryUrl(pathValue)
    };
  }, [data?.currentPath]);

  function chooseTrack(track: MusicTrack) {
    setSelectedTrackPath(track.path);
    setAutoplayPending(true);
  }

  return (
    <main id="main-content" className="site-main music-route-main">
      <section className="story-route-shell music-route-shell">
        <div className="story-route-topbar">
          <a href="/" className="story-back-link">
            <ArrowLeft className="h-4 w-4" />
            Back home
          </a>
          {parentDirectory && (
            <a href={parentDirectory.url} className="story-feed-link">
              <FolderOpen className="h-4 w-4" />
              Up one folder
            </a>
          )}
        </div>

        <header className="story-route-hero music-route-hero">
          <div className="music-route-copy">
            <p className="thought-route-kicker">A room for the music we keep close</p>
            <h1>Listening Room</h1>
            <p className="story-route-summary">
              A simple room for albums, singalongs, and late-night rediscoveries, kept easy to
              browse without turning it into a whole project just to play one song.
            </p>
            {data && data.available && (
              <div className="story-route-stats">
                <div>
                  <strong>{data.totalDirectories}</strong>
                  <span>Folders in this room</span>
                </div>
                <div>
                  <strong>{data.totalTracks}</strong>
                  <span>Playable tracks here</span>
                </div>
                <div>
                  <strong>{data.currentPath || 'Library root'}</strong>
                  <span>Current shelf</span>
                </div>
              </div>
            )}
          </div>

          <div className="story-route-hero-card music-route-note">
            <span>Why it is here</span>
            <strong>Good music should be easy to stumble back into.</strong>
            <p>
              This page is for the songs we do not want buried: the familiar albums, the old
              favorites, and the stuff that still makes the house feel lived in.
            </p>
          </div>
        </header>

        {loading && !data && (
          <div className="music-route-empty">
            <strong>The listening room is opening.</strong>
            <p>I am arranging the current shelf now.</p>
          </div>
        )}

        {!loading && error && !data && (
          <div className="music-route-empty">
            <strong>The listening room hit a snag.</strong>
            <p>{error}</p>
          </div>
        )}

        {!loading && data && !data.available && (
          <div className="music-route-empty">
            <strong>The music room is quiet right now.</strong>
            <p>
              The page is ready. The music folder just is not connected to the running app at the
              moment.
            </p>
          </div>
        )}

        {!loading && data && data.available && (
          <section className="music-browser-grid">
            <div className="music-browser-card">
              <div className="music-breadcrumbs" aria-label="Music library breadcrumbs">
                {data.breadcrumbs.map((breadcrumb, index) => (
                  <React.Fragment key={breadcrumb.path || 'root'}>
                    <a href={buildDirectoryUrl(breadcrumb.path)}>{breadcrumb.label}</a>
                    {index < data.breadcrumbs.length - 1 && (
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {data.directories.length > 0 && (
                <div className="music-folder-grid" aria-label="Music folders">
                  {data.directories.map((directory) => (
                    <a key={directory.path} href={directory.url} className="music-folder-link">
                      <span className="music-folder-copy">
                        <strong>{directory.name}</strong>
                        <span>Open folder</span>
                      </span>
                      <FolderOpen className="h-4 w-4" aria-hidden />
                    </a>
                  ))}
                </div>
              )}

              {data.tracks.length > 0 ? (
                <ol className="music-track-list" aria-label="Tracks in this folder">
                  {data.tracks.map((track) => (
                    <li
                      key={track.path}
                      className={
                        selectedTrack?.path === track.path
                          ? 'music-track-item music-track-item-active'
                          : 'music-track-item'
                      }
                    >
                      <button
                        type="button"
                        className="music-track-button"
                        onClick={() => chooseTrack(track)}
                      >
                        <span className="music-track-icon">
                          <Play className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="music-track-copy">
                          <strong>{track.title}</strong>
                          <span>{track.fileName}</span>
                        </span>
                        <span className="music-track-meta">{formatBytes(track.sizeBytes)}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="music-track-empty">
                  <strong>No playable tracks in this folder yet.</strong>
                  <p>Open another folder above, or come back when this shelf has something worth spinning.</p>
                </div>
              )}

              {data.truncated && (
                <p className="music-truncated-note">
                  This folder is large, so the page is showing the first few hundred entries to keep
                  browsing quick.
                </p>
              )}
            </div>

            <aside className="music-player-card">
              <div className="music-player-copy">
                <span className="music-player-kicker">Now loaded</span>
                <strong>{selectedTrack?.title ?? 'Pick a track to start listening'}</strong>
                <p>
                  {selectedTrack
                    ? selectedTrack.fileName
                    : 'This player stays ready while you browse the shelf.'}
                </p>
              </div>

              {selectedTrack ? (
                <>
                  <audio
                    ref={audioRef}
                    className="music-player-audio"
                    controls
                    preload="metadata"
                    src={selectedTrack.url}
                  />
                  <a href={selectedTrack.url} className="btn btn-ghost">
                    <Headphones className="h-4 w-4" />
                    Open raw file
                  </a>
                </>
              ) : (
                <div className="music-player-empty">
                  <Music4 className="h-5 w-5" aria-hidden />
                  <p>Choose a track from the shelf to load it into the player.</p>
                </div>
              )}

              <div className="music-player-tip">
                <Sparkles className="h-4 w-4" aria-hidden />
                <span>The page refreshes while open, so new files landing in the current folder show up automatically.</span>
              </div>
            </aside>
          </section>
        )}
      </section>
    </main>
  );
}
