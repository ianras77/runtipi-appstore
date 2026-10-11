import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Copy,
  ExternalLink,
  Headphones,
  Play,
  Radio,
  ShoppingBag,
  Sparkles
} from 'lucide-react';
import { useLiveJson } from './liveContent';
import { usePageMeta } from './pageMeta';

const STORIES_LIBRARY_PATH = '/bedtime-stories';
type StoryShow = {
  title: string;
  subtitle: string;
  description: string;
  author: string;
  pageUrl: string;
  feedUrl: string;
  feedAbsoluteUrl: string;
  imageUrl?: string;
  bookCount: number;
  episodeCount: number;
};

type StoryBookSummary = {
  slug: string;
  title: string;
  subtitle: string;
  author: string;
  summary: string;
  description: string;
  seasonNumber: number;
  featured: boolean;
  coverUrl?: string;
  purchaseUrl?: string;
  purchaseLabel?: string;
  pageUrl: string;
  seasonFeedUrl: string;
  seasonFeedAbsoluteUrl: string;
  episodeCount: number;
  latestEpisodePublishedAt?: string;
  latestEpisodeTitle?: string;
};

type StoryEpisode = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  episodeNumber: number;
  publishedAt: string;
  audioUrl: string;
};

type StoriesLibraryResponse = {
  show: StoryShow;
  featuredBook?: StoryBookSummary;
  books: StoryBookSummary[];
};

type StoryBookDetailResponse = {
  show: StoryShow;
  book: StoryBookSummary & {
    episodes: StoryEpisode[];
  };
};

const FALLBACK_STORY_SHOW: StoryShow = {
  title: 'Real Life Bedtime Stories',
  subtitle: 'A little shelf of bedtime recordings.',
  description: 'Bedtime stories kept close for the family.',
  author: 'Rassy',
  pageUrl: STORIES_LIBRARY_PATH,
  feedUrl: '/podcast/real-life-bedtime-stories.xml',
  feedAbsoluteUrl: '/podcast/real-life-bedtime-stories.xml',
  bookCount: 0,
  episodeCount: 0
};

function getStoryBooks(data?: StoriesLibraryResponse) {
  return Array.isArray(data?.books) ? data.books : [];
}

const STORY_PALETTES = [
  { start: '#6b3f2a', end: '#e6a05d', glow: 'rgba(230, 160, 93, 0.34)' },
  { start: '#304b73', end: '#8cc6ff', glow: 'rgba(140, 198, 255, 0.3)' },
  { start: '#315b4c', end: '#9bd4aa', glow: 'rgba(155, 212, 170, 0.28)' },
  { start: '#6f2f4f', end: '#f0a6cf', glow: 'rgba(240, 166, 207, 0.28)' }
];

function derivePalette(seed: string) {
  const total = Array.from(seed).reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return STORY_PALETTES[total % STORY_PALETTES.length];
}

function formatDate(value?: string) {
  if (!value) return 'Ready whenever you are';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Ready whenever you are';
  return parsed.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

async function copyText(text: string) {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    throw new Error('Clipboard copy is not available in this browser.');
  }
  await navigator.clipboard.writeText(text);
}

function decodeEpisodeHash(rawHash: string) {
  const trimmed = rawHash.replace(/^#/, '').trim();
  if (!trimmed) return null;

  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

function resolveEpisodeIndex(book: StoryBookDetailResponse['book'], rawHash: string) {
  const slug = decodeEpisodeHash(rawHash);
  if (!slug) return null;

  const index = book.episodes.findIndex((episode) => episode.slug === slug);
  return index >= 0 ? index : null;
}

function replaceEpisodeHash(slug: string) {
  if (typeof window === 'undefined') return;

  const nextHash = `#${encodeURIComponent(slug)}`;
  if (window.location.hash === nextHash) return;

  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${window.location.search}${nextHash}`
  );
}

function scrollEpisodeIntoView(slug: string) {
  if (typeof document === 'undefined') return;

  const element = document.getElementById(slug);
  if (!element || typeof element.scrollIntoView !== 'function') return;

  element.scrollIntoView({ block: 'nearest' });
}

function StoryArtwork({
  title,
  slug,
  coverUrl,
  variant = 'card'
}: {
  title: string;
  slug: string;
  coverUrl?: string;
  variant?: 'card' | 'hero';
}) {
  const palette = derivePalette(slug);
  const initials = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  if (coverUrl) {
    return (
      <div className={`story-art story-art-${variant}`}>
        <img src={coverUrl} alt={`Cover art for ${title}`} loading="lazy" />
      </div>
    );
  }

  return (
    <div
      className={`story-art story-art-${variant}`}
      style={
        {
          '--story-art-start': palette.start,
          '--story-art-end': palette.end,
          '--story-art-glow': palette.glow
        } as React.CSSProperties
      }
    >
      <span>{initials || 'RL'}</span>
      <small>{title}</small>
    </div>
  );
}

function useStoriesLibrary() {
  return useLiveJson<StoriesLibraryResponse>('/api/stories', 'Stories unavailable');
}

function useStoryBook(slug: string) {
  return useLiveJson<StoryBookDetailResponse>(
    `/api/stories/${encodeURIComponent(slug)}`,
    'Story unavailable'
  );
}

function FeedActions({
  feedUrl,
  feedAbsoluteUrl,
  subtle = false
}: {
  feedUrl: string;
  feedAbsoluteUrl: string;
  subtle?: boolean;
}) {
  const [copyState, setCopyState] = useState<string | null>(null);

  async function copyFeed() {
    try {
      await copyText(feedAbsoluteUrl);
      setCopyState('Podcast link copied');
      window.setTimeout(() => setCopyState(null), 1600);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Copy failed';
      setCopyState(message);
      window.setTimeout(() => setCopyState(null), 1800);
    }
  }

  return (
    <div className={subtle ? 'story-feed-actions story-feed-actions-subtle' : 'story-feed-actions'}>
      <a href={feedUrl} className="btn btn-primary">
        <Radio className="h-4 w-4" />
        Open podcast feed
      </a>
      <button type="button" className="btn btn-ghost" onClick={() => void copyFeed()}>
        <Copy className="h-4 w-4" />
        Copy RSS link
      </button>
      {copyState && <span className="story-copy-note">{copyState}</span>}
    </div>
  );
}

function StoryCard({ book }: { book: StoryBookSummary }) {
  return (
    <article className="story-card">
      <StoryArtwork title={book.title} slug={book.slug} coverUrl={book.coverUrl} />
      <div className="story-card-copy">
        <div className="story-card-meta">
          <span>{`Season ${book.seasonNumber}`}</span>
          <span>{`${book.episodeCount} episode${book.episodeCount === 1 ? '' : 's'}`}</span>
        </div>
        <h3>{book.title}</h3>
        {book.subtitle && <p className="story-card-subtitle">{book.subtitle}</p>}
        <p>{book.summary}</p>
        <div className="story-card-footer">
          <div>
            <strong>{book.author}</strong>
            <span>{book.latestEpisodeTitle ? `Latest: ${book.latestEpisodeTitle}` : 'Ready to listen'}</span>
          </div>
          <div className="story-card-actions">
            <a href={book.pageUrl} className="btn btn-primary">
              <Headphones className="h-4 w-4" />
              Open season
            </a>
            {book.purchaseUrl && (
              <a href={book.purchaseUrl} target="_blank" rel="noreferrer" className="btn btn-ghost">
                <ShoppingBag className="h-4 w-4" />
                Buy the book
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function BedtimeStoriesHighlight() {
  const { loading, error, data } = useStoriesLibrary();
  const books = getStoryBooks(data);
  const show = data?.show ?? FALLBACK_STORY_SHOW;
  const featured = data?.featuredBook ?? books[0];
  const supportingBooks = useMemo(
    () => books.filter((book) => book.slug !== featured?.slug).slice(0, 2),
    [books, featured?.slug]
  );

  return (
    <section id="stories" className="panel panel-story-highlight reveal reveal-3" aria-labelledby="stories-heading">
      <div className="section-head">
        <BookOpen className="h-5 w-5" aria-hidden />
        <div>
          <h2 id="stories-heading">Real Life Bedtime Stories</h2>
          <p>
            A little shelf of bedtime recordings made with love, kept easy to reach when the house
            is winding down and somebody wants a familiar voice.
          </p>
        </div>
      </div>

      {loading && (
        <div className="story-highlight-empty">
          <strong>The story shelf is warming up.</strong>
          <p>I am checking the library and gathering the latest books for this cozy corner.</p>
        </div>
      )}

      {!loading && error && (
        <div className="story-highlight-empty">
          <strong>The shelf is taking a quiet breath.</strong>
          <p>{error}</p>
          <a href={STORIES_LIBRARY_PATH} className="btn btn-primary">
            <Headphones className="h-4 w-4" />
            Open the story library
          </a>
        </div>
      )}

      {!loading && !error && data && !featured && (
        <div className="story-highlight-empty">
          <strong>The shelf is ready for the first book.</strong>
          <p>
            The first bedtime book will show up here when it is ready. This corner is waiting for
            the stories we want to keep close.
          </p>
          <a href={STORIES_LIBRARY_PATH} className="btn btn-primary">
            <Sparkles className="h-4 w-4" />
            See the library page
          </a>
        </div>
      )}

      {!loading && !error && data && featured && (
        <div className="story-highlight-grid">
          <article className="story-highlight-feature">
            <div className="story-highlight-art">
              <StoryArtwork
                title={featured.title}
                slug={featured.slug}
                coverUrl={featured.coverUrl}
                variant="hero"
              />
            </div>
            <div className="story-highlight-copy">
              <div className="story-eyebrow">
                <span>{show.title}</span>
                <span>{`${show.bookCount || books.length} books`}</span>
                <span>{`${show.episodeCount} episodes`}</span>
              </div>
              <h3>{featured.title}</h3>
              <p className="story-highlight-summary">{featured.summary}</p>
              <div className="story-stat-row">
                <div>
                  <strong>{`Season ${featured.seasonNumber}`}</strong>
                  <span>{`${featured.episodeCount} episode${featured.episodeCount === 1 ? '' : 's'}`}</span>
                </div>
                <div>
                  <strong>{featured.author}</strong>
                  <span>{featured.latestEpisodePublishedAt ? formatDate(featured.latestEpisodePublishedAt) : 'Fresh from the shelf'}</span>
                </div>
              </div>
              <div className="story-highlight-actions">
                <a href={featured.pageUrl} className="btn btn-primary">
                  <Play className="h-4 w-4" />
                  Listen to this book
                </a>
                <a href={STORIES_LIBRARY_PATH} className="btn btn-ghost">
                  <BookOpen className="h-4 w-4" />
                  Browse the whole shelf
                </a>
                <a href={data.show.feedUrl} className="btn btn-ghost">
                  <Radio className="h-4 w-4" />
                  Podcast feed
                </a>
              </div>
            </div>
          </article>

          <div className="story-support-grid">
            {supportingBooks.map((book) => (
              <a key={book.slug} href={book.pageUrl} className="story-support-card">
                <StoryArtwork title={book.title} slug={book.slug} coverUrl={book.coverUrl} />
                <div>
                  <strong>{book.title}</strong>
                  <span>{`${book.episodeCount} episode${book.episodeCount === 1 ? '' : 's'} in season ${book.seasonNumber}`}</span>
                </div>
              </a>
            ))}

            <div className="story-support-card story-support-card-feed">
              <div>
                <strong>Subscribe once, keep the whole shelf close.</strong>
                <span>Keep the stories handy in a podcast app, or just come back here whenever bedtime calls.</span>
              </div>
              <FeedActions
                feedUrl={data.show.feedUrl}
                feedAbsoluteUrl={data.show.feedAbsoluteUrl}
                subtle
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function StoriesEmptyState({ show }: { show?: StoryShow | null }) {
  return (
    <div className="story-route-empty">
      <div className="story-route-empty-copy">
        <span className="story-route-kicker">{show?.title ?? 'Real Life Bedtime Stories'}</span>
        <h2>The shelf is ready for the first bedtime book.</h2>
        <p>
          This page is ready whenever the first cozy recording is. The shelf is here to make
          bedtime feel warm, familiar, and easy to come back to.
        </p>
      </div>
    </div>
  );
}

export function BedtimeStoriesLibraryPage() {
  const { loading, error, data } = useStoriesLibrary();
  const books = getStoryBooks(data);
  const show = data?.show ?? FALLBACK_STORY_SHOW;
  usePageMeta(
    'Real Life Bedtime Stories | Rassy',
    'A cozy family shelf of bedtime stories recorded with love and kept close for later nights.'
  );

  return (
    <main id="main-content" className="site-main story-route-main">
      <section className="story-route-shell">
        <div className="story-route-topbar">
          <a href="/" className="story-back-link">
            <ArrowLeft className="h-4 w-4" />
            Back home
          </a>
          {data && (
            <a href={show.feedUrl} className="story-feed-link">
              <Radio className="h-4 w-4" />
              Podcast feed
            </a>
          )}
        </div>

        <header className="story-route-hero">
          <div className="story-route-copy">
            <p className="story-route-kicker">A cozy family podcast shelf</p>
            <h1>Real Life Bedtime Stories</h1>
            <p className="story-route-summary">
              Books recorded for one child at a time, presented like a polished little listening
              library so bedtime feels gentle instead of fiddly.
            </p>
            {data && (
              <>
                <div className="story-route-stats">
                  <div>
                    <strong>{show.bookCount || books.length}</strong>
                    <span>Books on the shelf</span>
                  </div>
                  <div>
                    <strong>{show.episodeCount}</strong>
                    <span>Total episodes</span>
                  </div>
                  <div>
                    <strong>{show.author}</strong>
                    <span>Voice behind the stories</span>
                  </div>
                </div>
                <FeedActions
                  feedUrl={show.feedUrl}
                  feedAbsoluteUrl={show.feedAbsoluteUrl}
                />
              </>
            )}
          </div>

          <div className="story-route-hero-card">
            <span>Why it is here</span>
            <strong>A bedtime shelf should feel simple, calm, and easy to revisit.</strong>
            <p>
              This page keeps the stories close at hand when someone wants a familiar voice and a
              softer landing into sleep.
            </p>
          </div>
        </header>

        {loading && (
          <div className="story-highlight-empty">
            <strong>The shelf is being arranged.</strong>
            <p>I am gathering the books and episodes for this page right now.</p>
          </div>
        )}

        {!loading && error && (
          <div className="story-highlight-empty">
            <strong>The library is taking a breath.</strong>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && data && books.length === 0 && <StoriesEmptyState show={show} />}

        {!loading && !error && data && books.length > 0 && (
          <section className="story-library-grid" aria-label="Bedtime story books">
            {books.map((book) => (
              <StoryCard key={book.slug} book={book} />
            ))}
          </section>
        )}
      </section>
    </main>
  );
}

function StorySeasonPlayer({ book }: { book: StoryBookDetailResponse['book'] }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(() =>
    typeof window === 'undefined' ? 0 : resolveEpisodeIndex(book, window.location.hash) ?? 0
  );
  const [autoplayPending, setAutoplayPending] = useState(false);

  const currentEpisode = book.episodes[selectedIndex] ?? book.episodes[0];

  useEffect(() => {
    const nextIndex =
      typeof window === 'undefined' ? 0 : resolveEpisodeIndex(book, window.location.hash) ?? 0;
    setSelectedIndex(nextIndex);
    setAutoplayPending(false);

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      const selectedEpisode = book.episodes[nextIndex];
      if (selectedEpisode) {
        window.requestAnimationFrame(() => scrollEpisodeIntoView(selectedEpisode.slug));
      }
    }
  }, [book]);

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
  }, [autoplayPending, currentEpisode?.audioUrl]);

  useEffect(() => {
    if (typeof window === 'undefined') return () => undefined;

    const handleHashChange = () => {
      const nextIndex = resolveEpisodeIndex(book, window.location.hash);
      if (nextIndex === null) return;

      setSelectedIndex(nextIndex);
      setAutoplayPending(false);

      const selectedEpisode = book.episodes[nextIndex];
      if (selectedEpisode && typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => scrollEpisodeIntoView(selectedEpisode.slug));
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [book]);

  function chooseEpisode(index: number) {
    setSelectedIndex(index);
    setAutoplayPending(true);
    const selectedEpisode = book.episodes[index];
    if (selectedEpisode) {
      replaceEpisodeHash(selectedEpisode.slug);
    }
  }

  function handleEnded() {
    if (selectedIndex >= book.episodes.length - 1) return;
    const nextIndex = selectedIndex + 1;
    setSelectedIndex(nextIndex);
    setAutoplayPending(true);
    const nextEpisode = book.episodes[nextIndex];
    if (nextEpisode) {
      replaceEpisodeHash(nextEpisode.slug);
    }
  }

  if (book.episodes.length === 0) {
    return (
      <div className="story-player-empty">
        <strong>This season page is ready.</strong>
        <p>The episodes will appear here as soon as the first recording is ready to share.</p>
      </div>
    );
  }

  return (
    <div className="story-player-shell">
      <div className="story-player-card">
        <div className="story-player-top">
          <span className="story-player-kicker">Now playing</span>
          <strong>{currentEpisode?.title}</strong>
          <p>{currentEpisode?.summary}</p>
        </div>
        <audio
          ref={audioRef}
          className="story-player-audio"
          controls
          preload="metadata"
          src={currentEpisode?.audioUrl}
          onEnded={handleEnded}
        />
      </div>

      <ol className="story-episode-list">
        {book.episodes.map((episode, index) => (
          <li
            key={episode.slug}
            id={episode.slug}
            className={index === selectedIndex ? 'story-episode-item active' : 'story-episode-item'}
          >
            <button type="button" className="story-episode-button" onClick={() => chooseEpisode(index)}>
              <span className="story-episode-number">{episode.episodeNumber}</span>
              <span className="story-episode-copy">
                <strong>{episode.title}</strong>
                <span>{episode.summary}</span>
              </span>
              <span className="story-episode-date">{formatDate(episode.publishedAt)}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function BedtimeStoryPage({ slug }: { slug: string }) {
  const { loading, error, data } = useStoryBook(slug);
  usePageMeta(
    data ? `${data.book.title} | Real Life Bedtime Stories` : 'Bedtime story season | Real Life Bedtime Stories',
    data?.book.summary || 'A cozy story season kept close for bedtime and replayed favorite moments.'
  );

  return (
    <main id="main-content" className="site-main story-route-main">
      <section className="story-route-shell">
        <div className="story-route-topbar">
          <a href={STORIES_LIBRARY_PATH} className="story-back-link">
            <ArrowLeft className="h-4 w-4" />
            Back to the shelf
          </a>
          <a href="/" className="story-feed-link">
            <BookOpen className="h-4 w-4" />
            Home page
          </a>
        </div>

        {loading && (
          <div className="story-highlight-empty">
            <strong>This story is opening.</strong>
            <p>I am pulling the season details and episode list together now.</p>
          </div>
        )}

        {!loading && error && (
          <div className="story-highlight-empty">
            <strong>The story was hard to find.</strong>
            <p>{error}</p>
            <a href={STORIES_LIBRARY_PATH} className="btn btn-primary">
              <BookOpen className="h-4 w-4" />
              Back to the library
            </a>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <header className="story-book-hero">
              <div className="story-book-art">
                <StoryArtwork
                  title={data.book.title}
                  slug={data.book.slug}
                  coverUrl={data.book.coverUrl}
                  variant="hero"
                />
              </div>

              <div className="story-book-copy">
                <p className="story-route-kicker">{`Season ${data.book.seasonNumber}`}</p>
                <h1>{data.book.title}</h1>
                {data.book.subtitle && <p className="story-card-subtitle">{data.book.subtitle}</p>}
                <p className="story-route-summary">{data.book.description}</p>
                <div className="story-route-stats">
                  <div>
                    <strong>{data.book.episodeCount}</strong>
                    <span>Episodes</span>
                  </div>
                  <div>
                    <strong>{data.book.author}</strong>
                    <span>Book author</span>
                  </div>
                  <div>
                    <strong>{data.book.latestEpisodePublishedAt ? formatDate(data.book.latestEpisodePublishedAt) : 'Ready now'}</strong>
                    <span>Latest episode</span>
                  </div>
                </div>

                <div className="story-book-actions">
                  <a href="#season-player" className="btn btn-primary">
                    <Headphones className="h-4 w-4" />
                    Jump to the player
                  </a>
                  {data.book.purchaseUrl && (
                    <a
                      href={data.book.purchaseUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-ghost"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      {data.book.purchaseLabel ?? 'Buy the book'}
                    </a>
                  )}
                  <a href={data.book.seasonFeedUrl} className="btn btn-ghost">
                    <Radio className="h-4 w-4" />
                    Season feed
                  </a>
                </div>
              </div>
            </header>

            <section className="story-detail-grid">
              <div className="story-detail-main">
                <div className="story-detail-card" id="season-player">
                  <div className="story-detail-head">
                    <Headphones className="h-5 w-5" aria-hidden />
                    <div>
                      <h2>Listen to the season</h2>
                      <p>One player, one clean episode list, and no hunting around at bedtime.</p>
                    </div>
                  </div>
                  <StorySeasonPlayer book={data.book} />
                </div>
              </div>

              <aside className="story-detail-side">
                <div className="story-detail-card">
                  <div className="story-detail-head">
                    <Sparkles className="h-5 w-5" aria-hidden />
                    <div>
                      <h2>Keep this season handy</h2>
                      <p>Use the feed for podcast apps, or keep the book link close for later.</p>
                    </div>
                  </div>
                  <FeedActions
                    feedUrl={data.book.seasonFeedUrl}
                    feedAbsoluteUrl={data.book.seasonFeedAbsoluteUrl}
                  />
                  <a href={data.show.feedUrl} className="story-inline-link">
                    Open the full show feed
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                </div>
              </aside>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
