import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import App from "./App";

describe("App", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/");

    vi.spyOn(globalThis, "fetch").mockImplementation(
      (input: string | URL | Request) => {
        const url = String(input);

        if (url.includes("/api/config")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                publicBaseUrl: "https://www.rasies.com",
                personalSiteUrl: "https://rassys.com",
                heimdallUrl: "https://apps.rasies.com",
                searchUrl: "https://search.rasies.com",
                glanceUrl: "https://glance.rasies.com",
                gamesUrl: "https://gba.rasies.com",
                authentikUrl: "https://auth.rasies.com/",
                signupUrl: "https://signup.rasies.com",
                plexUrl: "https://plex.rasies.com",
                signupEnabled: true,
                dataUrl: "https://data.rasies.com",
                photosUrl: "https://photos.rasies.com",
                sendUrl: "https://send.rasies.com",
                gristUrl: "https://grist.rasies.com",
                drawUrl: "https://draw.rasies.com",
                affineUrl: "https://affine.rasies.com",
                mcTroupServerHost: "crafty.rasies.com:25565",
                mcTroupBlueMapUrl: "http://192.168.100.10:8100",
                mcTroupBlueMapEmbedUrl: "/mc-troup-map/",
                about: {
                  name: "Rassy",
                  tagline: "Builder of the family cloud.",
                  bio: "A friendly place for family apps and experiments.",
                  highlights: ["Search", "Chat", "Arcade"],
                },
              }),
            ),
          );
        }

        if (url.includes("/api/stories/goodnight-moon")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                show: {
                  title: "Real Life Bedtime Stories",
                  subtitle: "A tiny shelf of books for my daughter.",
                  description: "Bedtime stories read with heart.",
                  author: "Rassy",
                  pageUrl: "/bedtime-stories",
                  feedUrl: "/podcast/real-life-bedtime-stories.xml",
                  feedAbsoluteUrl:
                    "https://www.rasies.com/podcast/real-life-bedtime-stories.xml",
                  bookCount: 2,
                  episodeCount: 3,
                },
                book: {
                  slug: "goodnight-moon",
                  title: "Goodnight Moon",
                  subtitle: "A quiet little room to say goodnight to.",
                  author: "Margaret Wise Brown",
                  summary: "A soft, familiar bedtime classic.",
                  description: "A soft, familiar bedtime classic.",
                  seasonNumber: 1,
                  featured: true,
                  coverUrl: "/stories-media/goodnight-moon/cover.jpg",
                  purchaseUrl:
                    "https://www.amazon.com/dp/0064430170?tag=rasies-20",
                  purchaseLabel: "Buy the book on Amazon",
                  pageUrl: "/bedtime-stories/goodnight-moon",
                  seasonFeedUrl:
                    "/podcast/real-life-bedtime-stories/goodnight-moon.xml",
                  seasonFeedAbsoluteUrl:
                    "https://www.rasies.com/podcast/real-life-bedtime-stories/goodnight-moon.xml",
                  episodeCount: 2,
                  latestEpisodePublishedAt: "2026-03-15T12:00:00.000Z",
                  latestEpisodeTitle: "Goodnight noises everywhere",
                  episodes: [
                    {
                      slug: "in-the-great-green-room",
                      title: "In The Great Green Room",
                      summary: "The room opens and bedtime begins.",
                      description: "The room opens and bedtime begins.",
                      episodeNumber: 1,
                      publishedAt: "2026-03-14T12:00:00.000Z",
                      audioUrl:
                        "/stories-media/goodnight-moon/01%20-%20In%20the%20great%20green%20room.mp3",
                    },
                    {
                      slug: "goodnight-noises-everywhere",
                      title: "Goodnight noises everywhere",
                      summary:
                        "The room settles and the story softens into sleep.",
                      description:
                        "The room settles and the story softens into sleep.",
                      episodeNumber: 2,
                      publishedAt: "2026-03-15T12:00:00.000Z",
                      audioUrl:
                        "/stories-media/goodnight-moon/02%20-%20Goodnight%20noises%20everywhere.m4a",
                    },
                  ],
                },
              }),
            ),
          );
        }

        if (url.includes("/api/stories")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                show: {
                  title: "Real Life Bedtime Stories",
                  subtitle: "A tiny shelf of books for my daughter.",
                  description: "Bedtime stories read with heart.",
                  author: "Rassy",
                  pageUrl: "/bedtime-stories",
                  feedUrl: "/podcast/real-life-bedtime-stories.xml",
                  feedAbsoluteUrl:
                    "https://www.rasies.com/podcast/real-life-bedtime-stories.xml",
                  bookCount: 2,
                  episodeCount: 3,
                  imageUrl: "/stories-media/show/podcast-cover.jpg",
                },
                featuredBook: {
                  slug: "goodnight-moon",
                  title: "Goodnight Moon",
                  subtitle: "A quiet little room to say goodnight to.",
                  author: "Margaret Wise Brown",
                  summary: "A soft, familiar bedtime classic.",
                  description: "A soft, familiar bedtime classic.",
                  seasonNumber: 1,
                  featured: true,
                  coverUrl: "/stories-media/goodnight-moon/cover.jpg",
                  purchaseUrl:
                    "https://www.amazon.com/dp/0064430170?tag=rasies-20",
                  purchaseLabel: "Buy the book on Amazon",
                  pageUrl: "/bedtime-stories/goodnight-moon",
                  seasonFeedUrl:
                    "/podcast/real-life-bedtime-stories/goodnight-moon.xml",
                  seasonFeedAbsoluteUrl:
                    "https://www.rasies.com/podcast/real-life-bedtime-stories/goodnight-moon.xml",
                  episodeCount: 2,
                  latestEpisodePublishedAt: "2026-03-15T12:00:00.000Z",
                  latestEpisodeTitle: "Goodnight noises everywhere",
                },
                books: [
                  {
                    slug: "goodnight-moon",
                    title: "Goodnight Moon",
                    subtitle: "A quiet little room to say goodnight to.",
                    author: "Margaret Wise Brown",
                    summary: "A soft, familiar bedtime classic.",
                    description: "A soft, familiar bedtime classic.",
                    seasonNumber: 1,
                    featured: true,
                    coverUrl: "/stories-media/goodnight-moon/cover.jpg",
                    purchaseUrl:
                      "https://www.amazon.com/dp/0064430170?tag=rasies-20",
                    purchaseLabel: "Buy the book on Amazon",
                    pageUrl: "/bedtime-stories/goodnight-moon",
                    seasonFeedUrl:
                      "/podcast/real-life-bedtime-stories/goodnight-moon.xml",
                    seasonFeedAbsoluteUrl:
                      "https://www.rasies.com/podcast/real-life-bedtime-stories/goodnight-moon.xml",
                    episodeCount: 2,
                    latestEpisodePublishedAt: "2026-03-15T12:00:00.000Z",
                    latestEpisodeTitle: "Goodnight noises everywhere",
                  },
                  {
                    slug: "frog-and-toad",
                    title: "Frog and Toad",
                    subtitle: "",
                    author: "Arnold Lobel",
                    summary: "Small adventures and good friendship.",
                    description: "Small adventures and good friendship.",
                    seasonNumber: 2,
                    featured: false,
                    coverUrl: "/stories-media/frog-and-toad/cover.jpg",
                    pageUrl: "/bedtime-stories/frog-and-toad",
                    seasonFeedUrl:
                      "/podcast/real-life-bedtime-stories/frog-and-toad.xml",
                    seasonFeedAbsoluteUrl:
                      "https://www.rasies.com/podcast/real-life-bedtime-stories/frog-and-toad.xml",
                    episodeCount: 1,
                    latestEpisodePublishedAt: "2026-03-16T12:00:00.000Z",
                    latestEpisodeTitle: "Spring Is Here",
                  },
                ],
              }),
            ),
          );
        }

        if (url.includes("/api/thoughts/sunrise-notes")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                thought: {
                  slug: "sunrise-notes",
                  title: "Sunrise Notes",
                  summary: "A warm note about making useful things with care.",
                  publishedAt: "2026-03-18T12:00:00.000Z",
                  readingMinutes: 2,
                  featured: true,
                  tags: ["family", "build"],
                  pageUrl: "/thoughts/sunrise-notes",
                  pageAbsoluteUrl:
                    "https://www.rasies.com/thoughts/sunrise-notes",
                  assetBaseUrl: "/thoughts-media/",
                  content:
                    "# Sunrise Notes\n\nI want this site to feel hosted, not rented.\n\nThat means every corner should feel personal and easy to keep alive.",
                },
              }),
            ),
          );
        }

        if (url.includes("/api/thoughts")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                featuredThought: {
                  slug: "sunrise-notes",
                  title: "Sunrise Notes",
                  summary: "A warm note about making useful things with care.",
                  publishedAt: "2026-03-18T12:00:00.000Z",
                  readingMinutes: 2,
                  featured: true,
                  tags: ["family", "build"],
                  pageUrl: "/thoughts/sunrise-notes",
                  pageAbsoluteUrl:
                    "https://www.rasies.com/thoughts/sunrise-notes",
                },
                thoughts: [
                  {
                    slug: "sunrise-notes",
                    title: "Sunrise Notes",
                    summary:
                      "A warm note about making useful things with care.",
                    publishedAt: "2026-03-18T12:00:00.000Z",
                    readingMinutes: 2,
                    featured: true,
                    tags: ["family", "build"],
                    pageUrl: "/thoughts/sunrise-notes",
                    pageAbsoluteUrl:
                      "https://www.rasies.com/thoughts/sunrise-notes",
                  },
                  {
                    slug: "garden-log",
                    title: "Garden Log",
                    summary:
                      "The tomatoes are finally behaving and the basil is starting to feel ambitious.",
                    publishedAt: "2026-03-17T12:00:00.000Z",
                    readingMinutes: 1,
                    featured: false,
                    tags: ["garden"],
                    pageUrl: "/thoughts/garden-log",
                    pageAbsoluteUrl:
                      "https://www.rasies.com/thoughts/garden-log",
                  },
                ],
              }),
            ),
          );
        }

        if (url.includes("/api/music-library?path=Artists%2FNeil%20Young")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                available: true,
                currentPath: "Artists/Neil Young",
                title: "Neil Young",
                pageUrl: "/music-library?path=Artists%2FNeil%20Young",
                pageAbsoluteUrl:
                  "https://www.rasies.com/music-library?path=Artists%2FNeil%20Young",
                breadcrumbs: [
                  {
                    label: "Music Library",
                    path: "",
                    url: "https://www.rasies.com/music-library",
                  },
                  {
                    label: "Artists",
                    path: "Artists",
                    url: "https://www.rasies.com/music-library?path=Artists",
                  },
                  {
                    label: "Neil Young",
                    path: "Artists/Neil Young",
                    url: "https://www.rasies.com/music-library?path=Artists%2FNeil%20Young",
                  },
                ],
                directories: [],
                tracks: [
                  {
                    fileName: "01 - Heart of Gold.mp3",
                    title: "Heart Of Gold",
                    path: "Artists/Neil Young/01 - Heart of Gold.mp3",
                    url: "/music-library-media/Artists/Neil%20Young/01%20-%20Heart%20of%20Gold.mp3",
                    mimeType: "audio/mpeg",
                    sizeBytes: 2457600,
                    modifiedAt: "2026-03-20T12:00:00.000Z",
                  },
                  {
                    fileName: "02 - Old Man.flac",
                    title: "Old Man",
                    path: "Artists/Neil Young/02 - Old Man.flac",
                    url: "/music-library-media/Artists/Neil%20Young/02%20-%20Old%20Man.flac",
                    mimeType: "audio/flac",
                    sizeBytes: 7340032,
                    modifiedAt: "2026-03-20T12:01:00.000Z",
                  },
                ],
                totalDirectories: 0,
                totalTracks: 2,
                truncated: false,
              }),
            ),
          );
        }

        if (url.includes("/api/music-library")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                available: true,
                currentPath: "",
                title: "Music Library",
                pageUrl: "/music-library",
                pageAbsoluteUrl: "https://www.rasies.com/music-library",
                breadcrumbs: [
                  {
                    label: "Music Library",
                    path: "",
                    url: "https://www.rasies.com/music-library",
                  },
                ],
                directories: [
                  {
                    name: "Artists",
                    path: "Artists",
                    url: "/music-library?path=Artists",
                  },
                ],
                tracks: [],
                totalDirectories: 1,
                totalTracks: 0,
                truncated: false,
              }),
            ),
          );
        }

        if (url.includes("/api/version")) {
          return Promise.resolve(
            new Response(JSON.stringify({ buildTag: "test-build" })),
          );
        }

        if (url.includes("/api/signup/services")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                services: [
                  {
                    id: 1,
                    name: "Plex",
                    type: "plex",
                    url: "https://plex.rasies.com",
                    verified: true,
                    allowDownloads: true,
                    allowLiveTv: false,
                    allowMobileUploads: false,
                  },
                  {
                    id: 4,
                    name: "Navidrome",
                    type: "navidrome",
                    url: "https://music.rasies.com",
                    verified: true,
                    allowDownloads: true,
                    allowLiveTv: false,
                    allowMobileUploads: false,
                  },
                  {
                    id: 2,
                    name: "Audio Books",
                    type: "audiobookshelf",
                    url: "https://audio.rasies.com",
                    verified: true,
                    allowDownloads: false,
                    allowLiveTv: false,
                    allowMobileUploads: false,
                  },
                  {
                    id: 3,
                    name: "Books",
                    type: "kavita",
                    url: "https://books.rasies.com",
                    verified: true,
                    allowDownloads: false,
                    allowLiveTv: false,
                    allowMobileUploads: false,
                  },
                ],
              }),
            ),
          );
        }

        if (
          url.includes("/api/signup/invite-status") ||
          url.includes("/api/signup/plex-invite-status")
        ) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                status: "used",
                expiresAt: "2026-05-11T14:41:11.874824",
                usedBy: "Family Member",
                usedAt: "2026-04-10T10:15:00.000Z",
                serverNames: ["Plex", "Navidrome", "Audio Books", "Books"],
              }),
            ),
          );
        }

        if (
          url.includes("/api/signup/invite") ||
          url.includes("/api/signup/plex-invite")
        ) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                inviteUrl: "https://signup.rasies.com/j/F4N5218DH1",
                expiresAt: "2026-05-11T14:41:11.874824",
                code: "F4N5218DH1",
                reused: false,
                status: "pending",
                usedBy: null,
                usedAt: null,
                serverNames: ["Plex", "Navidrome", "Audio Books", "Books"],
              }),
            ),
          );
        }

        if (url.includes("/api/status")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                checkedAt: "2026-03-15T12:00:00.000Z",
                items: [
                  {
                    key: "public",
                    label: "Public Site",
                    url: "https://www.rasies.com",
                    state: "up",
                    statusCode: 200,
                    latencyMs: 123,
                  },
                ],
              }),
            ),
          );
        }

        if (url.includes("/api/house/health")) {
          return Promise.resolve(
            new Response(JSON.stringify({ ok: true, upstreamStatus: 200 })),
          );
        }

        if (url.includes("/api/house/spotlight")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                mood: "Studio warm and ready.",
                mission: "Ask for one practical next step.",
                surprise:
                  "Let House Chat help turn a noisy evening into a calmer plan.",
                prompts: ["Plan my week", "Draft a message"],
              }),
            ),
          );
        }

        if (url.includes("/api/house/chat")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                reply: "I read the attachment and can help with it.",
              }),
            ),
          );
        }

        return Promise.resolve(
          new Response(JSON.stringify({}), { status: 200 }),
        );
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.history.pushState({}, "", "/");
  });

  it("renders the homepage with the separated signup lanes and restored utility sections", async () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: /Family, start here\./i,
      }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Notes I want easy to find/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("textbox", { name: /Message House Chat/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /^House Chat$/i }),
      ).toBeInTheDocument();
      expect(screen.getByText(/^Prompt deck$/i)).toBeInTheDocument();
      expect(screen.getByText(/^Thread$/i)).toBeInTheDocument();
      expect(screen.getByText(/^Draft$/i)).toBeInTheDocument();
      expect(screen.getByText(/^Files$/i)).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /^Search$/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /^Media services signup$/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", {
          name: /^Family apps through Authentik$/i,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /^Birthday challenge$/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /^Self-hosted apps$/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /Immich photo library/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", {
          name: /Come and play Minecraft anytime/i,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", {
          name: /The listening shelf is here too/i,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getAllByRole("link", { name: /Media signup/i }).length,
      ).toBeGreaterThan(0);
      expect(
        screen.getAllByRole("link", {
          name: /Request family account|Open family waitlist|Full family access/i,
        }).length,
      ).toBeGreaterThan(0);
      expect(
        screen.getAllByRole("link", { name: /^Open app library$/i }).length,
      ).toBeGreaterThan(0);
      expect(
        screen.getByRole("link", { name: /^Open full apps guide$/i }),
      ).toBeInTheDocument();
      expect(screen.getAllByText(/Immich/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Nextcloud/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Sign-in Apps/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Direct Links/i).length).toBeGreaterThan(0);
    });

    expect(
      screen.queryByText(/Chat with the whole page, not a tiny corner/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/A roomy spot for plans/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Start with a spark/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Ask the messy version/i),
    ).not.toBeInTheDocument();

    expect(
      screen.getAllByRole("link", { name: /Media signup/i })[0],
    ).toHaveAttribute("href", "https://signup.rasies.com/j/RASIES");
    expect(
      screen.getAllByRole("link", {
        name: /Request family account|Open family waitlist|Full family access/i,
      })[0],
    ).toHaveAttribute(
      "href",
      "https://auth.rasies.com/if/flow/runtipi-waitlist-enrollment/",
    );
    expect(
      screen.getAllByRole("link", { name: /^Sign in to Authentik$/i })[0],
    ).toHaveAttribute("href", "https://auth.rasies.com/");
    expect(
      screen.getByRole("link", { name: /^Open full apps guide$/i }),
    ).toHaveAttribute("href", "/#/apps");
  });

  it("keeps the fallback about copy centered on the family, not implementation notes", async () => {
    window.history.pushState({}, "", "/apps");

    vi.mocked(globalThis.fetch).mockImplementation(
      (input: string | URL | Request) => {
        const url = String(input);

        if (url.includes("/api/config")) {
          return Promise.resolve(
            new Response(JSON.stringify({}), { status: 500 }),
          );
        }

        return Promise.resolve(
          new Response(JSON.stringify({}), { status: 200 }),
        );
      },
    );

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByText(/A familiar place for the stuff our family actually uses/i),
      ).toBeInTheDocument();
    });

    expect(screen.queryByText(/\bI built this\b/i)).not.toBeInTheDocument();
  });

  it("keeps media libraries and Authentik accounts as separate clear lanes", async () => {
    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          name: /Family, start here\./i,
        }),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("heading", {
        name: /Media libraries through Wizarr/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /One media invite can unlock every library Wizarr knows about/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /Family apps through Authentik/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/This is a separate account request/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", {
        name: /Request family account|Full family access/i,
      }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link", {
        name: /Media signup/i,
      }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", {
        name: /Family apps through Authentik/i,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Family access lane/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Step 2/i)).not.toBeInTheDocument();
  });

  it("creates a live media invite from the homepage signup panel", async () => {
    const user = userEvent.setup();
    render(<App />);

    const createInviteButton = await screen.findByRole("button", {
      name: /Create one invite for every media library/i,
    });

    await user.click(createInviteButton);

    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: /Open Wizarr signup/i }),
      ).toHaveAttribute("href", "https://signup.rasies.com/j/F4N5218DH1");
    });

    const inviteRequest = vi
      .mocked(globalThis.fetch)
      .mock.calls.find(([input]) =>
        String(input).includes("/api/signup/invite"),
      );

    expect(inviteRequest?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ serviceIds: [1, 4, 2, 3] }),
    });
  });

  it("sends chat uploads through the backend attachment contract", async () => {
    const user = userEvent.setup();
    render(<App />);

    const file = new File(["Please help me make this clearer."], "note.txt", {
      type: "text/plain",
    });

    await user.upload(
      await screen.findByLabelText(/Attach files for House Chat/i),
      file,
    );

    await waitFor(() => {
      expect(screen.getByText("note.txt")).toBeInTheDocument();
    });

    await user.type(
      screen.getByRole("textbox", { name: /Message House Chat/i }),
      "Can you read this?",
    );
    await user.click(screen.getByRole("button", { name: /^Send$/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/I read the attachment and can help with it/i),
      ).toBeInTheDocument();
    });

    const chatRequest = vi
      .mocked(globalThis.fetch)
      .mock.calls.find(([input]) => String(input).includes("/api/house/chat/stream"));

    expect(JSON.parse(String(chatRequest?.[1]?.body))).toMatchObject({
      files: [
        {
          name: "note.txt",
          type: "text/plain",
          size: file.size,
          content: "Please help me make this clearer.",
        },
      ],
    });
  });

  it("renders the full apps guide route", async () => {
    window.history.pushState({}, "", "/#/apps");
    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          name: /The app map, without the guessing\./i,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /Start with the right door/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /Family app library/i }),
      ).toBeInTheDocument();
      expect(
        screen.getAllByRole("heading", { name: /^Sign-in Apps$/i }).length,
      ).toBeGreaterThan(0);
      expect(
        screen.getAllByRole("heading", { name: /^Direct Links$/i }).length,
      ).toBeGreaterThan(0);
      expect(
        screen.getByRole("heading", { name: /On this site/i }),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("link", { name: /^Back to home$/i }),
    ).toHaveAttribute("href", "/");
    expect(
      screen.getAllByRole("link", { name: /Media signup/i })[0],
    ).toHaveAttribute("href", "https://signup.rasies.com/j/RASIES");
  });

  it("renders the bedtime stories library route", async () => {
    window.history.pushState({}, "", "/bedtime-stories");
    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Real Life Bedtime Stories/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/bedtime feels gentle instead of fiddly/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/Goodnight Moon/i)).toBeInTheDocument();
      expect(
        screen.getAllByRole("link", { name: /podcast feed/i }).length,
      ).toBeGreaterThan(0);
    });
  });

  it("renders the thoughts library route", async () => {
    window.history.pushState({}, "", "/thoughts");
    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /^Rassy Thoughts$/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /Some things are worth slowing down enough to write properly\./i,
        ),
      ).toBeInTheDocument();
      expect(screen.getByText(/Sunrise Notes/i)).toBeInTheDocument();
    });
  });

  it("renders the listening room route", async () => {
    window.history.pushState(
      {},
      "",
      "/music-library?path=Artists%2FNeil%20Young",
    );
    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /^Listening Room$/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Good music should be easy to stumble back into\./i),
      ).toBeInTheDocument();
      expect(screen.getAllByText(/Heart Of Gold/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Old Man/i).length).toBeGreaterThan(0);
    });
  });

  it("renders a single book season page", async () => {
    window.history.pushState({}, "", "/bedtime-stories/goodnight-moon");
    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /^Goodnight Moon$/i }),
      ).toBeInTheDocument();
      expect(screen.getByText(/Listen to the season/i)).toBeInTheDocument();
      expect(
        screen.getAllByText(/In The Great Green Room/i).length,
      ).toBeGreaterThan(0);
      expect(
        screen.getByRole("link", { name: /Season feed/i }),
      ).toBeInTheDocument();
    });
  });

  it("renders a single thought page", async () => {
    window.history.pushState({}, "", "/thoughts/sunrise-notes");
    render(<App />);

    await waitFor(() => {
      expect(
        screen.getAllByRole("heading", { name: /^Sunrise Notes$/i }).length,
      ).toBeGreaterThan(0);
      expect(screen.getByText(/hosted, not rented/i)).toBeInTheDocument();
      expect(screen.getByText(/Why I keep these notes/i)).toBeInTheDocument();
    });
  });

  it("opens a story season on the episode named in the url hash", async () => {
    window.history.pushState(
      {},
      "",
      "/bedtime-stories/goodnight-moon#goodnight-noises-everywhere",
    );
    render(<App />);

    await waitFor(() => {
      const audio = document.querySelector(
        "audio.story-player-audio",
      ) as HTMLAudioElement | null;
      expect(audio?.getAttribute("src")).toContain(
        "/stories-media/goodnight-moon/02%20-%20Goodnight%20noises%20everywhere.m4a",
      );
    });
  });
});
