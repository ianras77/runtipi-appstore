import React from 'react';
import { ArrowLeft, Clock3, Compass, ExternalLink, Feather, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useLiveJson } from './liveContent';
import { usePageMeta } from './pageMeta';

const THOUGHTS_LIBRARY_PATH = '/thoughts';
type ThoughtSummary = {
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  readingMinutes: number;
  featured: boolean;
  tags: string[];
  pageUrl: string;
  pageAbsoluteUrl: string;
};

type Thought = ThoughtSummary & {
  content: string;
  assetBaseUrl: string;
};

type ThoughtsLibraryResponse = {
  featuredThought?: ThoughtSummary;
  thoughts: ThoughtSummary[];
};

type ThoughtDetailResponse = {
  thought: Thought;
};

function getThoughtSummaries(data?: ThoughtsLibraryResponse) {
  return Array.isArray(data?.thoughts) ? data.thoughts : [];
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Freshly added';
  return parsed.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function resolveThoughtAssetUrl(assetBaseUrl: string, rawUrl?: string) {
  if (!rawUrl) return rawUrl ?? '';
  if (
    rawUrl.startsWith('/') ||
    rawUrl.startsWith('#') ||
    /^[a-z]+:/i.test(rawUrl)
  ) {
    return rawUrl;
  }

  try {
    return new URL(rawUrl, `https://www.rasies.com${assetBaseUrl}`).pathname;
  } catch {
    return rawUrl;
  }
}

function useThoughtsLibrary() {
  return useLiveJson<ThoughtsLibraryResponse>('/api/thoughts', 'Thoughts unavailable');
}

function useThought(slug: string) {
  return useLiveJson<ThoughtDetailResponse>(
    `/api/thoughts/${encodeURIComponent(slug)}`,
    'Thought unavailable'
  );
}

function ThoughtMeta({ thought }: { thought: ThoughtSummary }) {
  return (
    <div className="thought-meta-row">
      <span>{formatDate(thought.publishedAt)}</span>
      <span>{`${thought.readingMinutes} min read`}</span>
      {thought.featured && <span>Featured</span>}
    </div>
  );
}

function ThoughtTags({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;

  return (
    <div className="thought-tags" aria-label="Thought tags">
      {tags.map((tag) => (
        <span key={tag}>{tag}</span>
      ))}
    </div>
  );
}

function ThoughtCard({ thought, hero = false }: { thought: ThoughtSummary; hero?: boolean }) {
  return (
    <article className={hero ? 'thought-card thought-card-hero' : 'thought-card'}>
      <div className="thought-card-copy">
        <ThoughtMeta thought={thought} />
        <h3>{thought.title}</h3>
        <p>{thought.summary}</p>
        <ThoughtTags tags={thought.tags} />
      </div>

      <div className="thought-card-actions">
        <a href={thought.pageUrl} className="btn btn-primary">
          <Feather className="h-4 w-4" />
          Read post
        </a>
      </div>
    </article>
  );
}

function ThoughtsEmptyState() {
  return (
    <div className="thought-route-empty">
      <div className="thought-route-empty-copy">
        <span className="thought-route-kicker">Rassy Thoughts</span>
        <h2>The writing shelf is ready.</h2>
        <p>
          The first long note will land here when it is ready. This shelf is for family reflections,
          build notes, and the quieter thoughts worth keeping.
        </p>
      </div>
    </div>
  );
}

export function ThoughtsHighlight() {
  const { loading, error, data } = useThoughtsLibrary();
  const thoughts = getThoughtSummaries(data);
  const featured = data?.featuredThought ?? thoughts[0];
  const supportingThoughts = thoughts.filter((thought) => thought.slug !== featured?.slug).slice(0, 2);

  return (
    <section id="thoughts" className="panel panel-thoughts-highlight reveal reveal-3" aria-labelledby="thoughts-heading">
      <div className="section-head">
        <Compass className="h-5 w-5" aria-hidden />
        <div>
          <h2 id="thoughts-heading">Rassy Thoughts</h2>
          <p>
            Longer notes from the quieter side of the site: family reflections, field notes, and
            the kind of writing that deserves a slower shelf.
          </p>
        </div>
      </div>

      {loading && (
        <div className="thought-empty">
          <strong>The thought desk is opening.</strong>
          <p>I am gathering the latest notes and arranging the reading list now.</p>
        </div>
      )}

      {!loading && error && (
        <div className="thought-empty">
          <strong>The thought desk is taking a breath.</strong>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && data && !featured && <ThoughtsEmptyState />}

      {!loading && !error && data && featured && (
        <div className="thoughts-highlight-grid">
          <ThoughtCard thought={featured} hero />

          <div className="thought-support-grid">
            {supportingThoughts.map((thought) => (
              <a key={thought.slug} href={thought.pageUrl} className="thought-support-card">
                <div>
                  <strong>{thought.title}</strong>
                  <span>{thought.summary}</span>
                </div>
                <ThoughtMeta thought={thought} />
              </a>
            ))}

            <div className="thought-support-card thought-support-note">
              <strong>A quiet shelf for longer writing.</strong>
              <span>
                The thoughts page is where I keep the slower writing: life notes, build reflections,
                and the things I want the family to be able to come back to later.
              </span>
              <a href={THOUGHTS_LIBRARY_PATH} className="story-inline-link">
                Browse the thoughts page
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export function ThoughtsLibraryPage() {
  const { loading, error, data } = useThoughtsLibrary();
  const thoughts = getThoughtSummaries(data);
  usePageMeta(
    'Rassy Thoughts | Rassy',
    'A quiet shelf for longer notes about family life, home projects, and the slower side of the site.'
  );

  return (
    <main id="main-content" className="site-main thought-route-main">
      <section className="thought-route-shell">
        <div className="thought-route-topbar">
          <a href="/" className="story-back-link">
            <ArrowLeft className="h-4 w-4" />
            Back home
          </a>
        </div>

        <header className="thought-route-hero">
          <div className="thought-route-copy">
            <p className="thought-route-kicker">A quiet shelf for longer writing</p>
            <h1>Rassy Thoughts</h1>
            <p className="thought-route-summary">
              A quiet place for the longer writing: family reflections, field notes, and the sort
              of thoughts that deserve more room than a chat bubble.
            </p>
          </div>

          <div className="thought-route-note">
            <span>Why it is here</span>
            <strong>Some things are worth slowing down enough to write properly.</strong>
            <p>This shelf is for the notes I want to keep, revisit, and share with a little care.</p>
          </div>
        </header>

        {loading && (
          <div className="thought-empty">
            <strong>The thoughts page is filling in.</strong>
            <p>I am collecting the latest posts and arranging the reading list now.</p>
          </div>
        )}

        {!loading && error && (
          <div className="thought-empty">
            <strong>The thoughts page is taking a breath.</strong>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && data && thoughts.length === 0 && <ThoughtsEmptyState />}

        {!loading && !error && data && thoughts.length > 0 && (
          <section className="thought-library-grid" aria-label="Thought posts">
            {thoughts.map((thought) => (
              <ThoughtCard key={thought.slug} thought={thought} />
            ))}
          </section>
        )}
      </section>
    </main>
  );
}

export function ThoughtPage({ slug }: { slug: string }) {
  const { loading, error, data } = useThought(slug);
  usePageMeta(
    data ? `${data.thought.title} | Rassy Thoughts` : 'Thought post | Rassy Thoughts',
    data?.thought.summary || 'A quiet note from the slower writing shelf on the Rasies site.'
  );

  return (
    <main id="main-content" className="site-main thought-route-main">
      <section className="thought-route-shell">
        <div className="thought-route-topbar">
          <a href={THOUGHTS_LIBRARY_PATH} className="story-back-link">
            <ArrowLeft className="h-4 w-4" />
            Back to thoughts
          </a>
          <a href="/" className="story-feed-link">
            <Sparkles className="h-4 w-4" />
            Home page
          </a>
        </div>

        {loading && (
          <div className="thought-empty">
            <strong>This post is opening.</strong>
            <p>I am pulling the note into place now.</p>
          </div>
        )}

        {!loading && error && (
          <div className="thought-empty">
            <strong>The post was hard to find.</strong>
            <p>{error}</p>
            <a href={THOUGHTS_LIBRARY_PATH} className="btn btn-primary">
              <Compass className="h-4 w-4" />
              Back to thoughts
            </a>
          </div>
        )}

        {!loading && !error && data && (
          <article className="thought-page-shell">
            <header className="thought-page-hero">
              <p className="thought-route-kicker">From the slower writing shelf</p>
              <h1>{data.thought.title}</h1>
              <p className="thought-route-summary">{data.thought.summary}</p>
              <div className="thought-page-stats">
                <span>
                  <Clock3 className="h-4 w-4" aria-hidden />
                  {`${data.thought.readingMinutes} min read`}
                </span>
                <span>{formatDate(data.thought.publishedAt)}</span>
              </div>
              <ThoughtTags tags={data.thought.tags} />
            </header>

            <div className="thought-page-grid">
              <div className="thought-page-body">
                <div className="thought-page-card">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    className="markdown-message thought-markdown"
                    components={{
                      a: (props) => (
                        <a
                          {...props}
                          href={resolveThoughtAssetUrl(data.thought.assetBaseUrl, props.href)}
                          target="_blank"
                          rel="noreferrer"
                        />
                      ),
                      img: (props) => (
                        <img
                          {...props}
                          src={resolveThoughtAssetUrl(data.thought.assetBaseUrl, props.src)}
                          loading="lazy"
                        />
                      )
                    }}
                  >
                    {data.thought.content}
                  </ReactMarkdown>
                </div>
              </div>

              <aside className="thought-page-side">
                <div className="thought-page-card">
                  <div className="thought-detail-head">
                    <Feather className="h-5 w-5" aria-hidden />
                    <div>
                      <h2>Why I keep these notes</h2>
                      <p>
                        This is the shelf for the thoughts I want the family to be able to revisit:
                        little lessons, field notes, and snapshots of what mattered at the time.
                      </p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </article>
        )}
      </section>
    </main>
  );
}
