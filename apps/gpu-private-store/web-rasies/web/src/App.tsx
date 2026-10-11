import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Compass,
  ExternalLink,
  FileText,
  Gamepad2,
  Headphones,
  LayoutGrid,
  LockKeyhole,
  Map,
  MessageSquare,
  PenTool,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  AboutPanel,
  BirthdayEasterEgg,
  ChatPanel,
  FamilyAccessPanel,
  MinecraftPanel,
  SearchPanel,
  ServiceLaunchpad,
  StatusPanel,
} from "./components";
import type { ServiceLink } from "./components";
import {
  BedtimeStoriesHighlight,
  BedtimeStoriesLibraryPage,
  BedtimeStoryPage,
} from "./bedtimeStories";
import {
  ThoughtPage,
  ThoughtsHighlight,
  ThoughtsLibraryPage,
} from "./thoughts";
import { MusicLibraryPage } from "./musicLibrary";
import { usePageMeta } from "./pageMeta";

type AboutConfig = {
  name: string;
  tagline: string;
  bio: string;
  highlights: string[];
};

type Config = {
  publicBaseUrl: string;
  personalSiteUrl: string;
  heimdallUrl: string;
  searchUrl: string;
  glanceUrl: string;
  gamesUrl: string;
  authentikUrl: string;
  signupUrl: string;
  plexUrl: string;
  signupEnabled: boolean;
  dataUrl: string;
  photosUrl: string;
  sendUrl: string;
  gristUrl: string;
  drawUrl: string;
  affineUrl: string;
  mcTroupServerHost: string;
  mcTroupBlueMapUrl: string;
  mcTroupBlueMapEmbedUrl: string;
  about: AboutConfig;
};

type AppRoute =
  | { kind: "home" }
  | { kind: "apps" }
  | { kind: "music-library" }
  | { kind: "stories-library" }
  | { kind: "stories-book"; slug: string }
  | { kind: "thoughts-library" }
  | { kind: "thought"; slug: string };

type AppCatalogKind = "sign-in" | "direct";

type AppCatalogItem = {
  title: string;
  href: string;
  note: string;
  icon: React.ReactNode;
};

type AppCatalogGroup = {
  id: string;
  title: string;
  description: string;
  kind: AppCatalogKind;
  items: AppCatalogItem[];
};

const defaultAbout: AboutConfig = {
  name: "Rassy",
  tagline:
    "Husband, dad, gardener, and the person keeping this little family web house running.",
  bio: "A familiar place for the stuff our family actually uses: photos, notes, planning, media, and a few fun extras.",
  highlights: [
    "For our family",
    "Memories first",
    "Simple links",
    "Kept by Ian",
  ],
};

const FAMILY_ACCOUNT_REQUEST_URL =
  "https://auth.rasies.com/if/flow/runtipi-waitlist-enrollment/";
const FAMILY_APP_LIBRARY_URL = "https://auth.rasies.com/if/user/#/library";
const MEDIA_SIGNUP_DIRECT_URL = "https://signup.rasies.com/j/RASIES";

const defaultConfig: Config = {
  publicBaseUrl: "https://www.rasies.com",
  personalSiteUrl: "https://rassys.com",
  heimdallUrl: FAMILY_APP_LIBRARY_URL,
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
  mcTroupBlueMapUrl: "https://crafty.rasies.com/mc-troup-map",
  mcTroupBlueMapEmbedUrl: "/mc-troup-map/",
  about: defaultAbout,
};

const PRIVATE_IPV4_PATTERNS = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
];

function sanitizeAbout(data: Partial<AboutConfig> | undefined): AboutConfig {
  const highlights =
    data?.highlights?.filter(
      (item): item is string =>
        typeof item === "string" && item.trim().length > 0,
    ) ?? [];

  return {
    name: data?.name?.trim() || defaultAbout.name,
    tagline: data?.tagline?.trim() || defaultAbout.tagline,
    bio: data?.bio?.trim() || defaultAbout.bio,
    highlights: highlights.length > 0 ? highlights : defaultAbout.highlights,
  };
}

function extractServerHostname(serverHost: string | undefined) {
  const trimmed = serverHost?.trim() ?? "";
  if (!trimmed) return "crafty.rasies.com";

  if (trimmed.startsWith("[")) {
    const end = trimmed.indexOf("]");
    return end >= 0 ? trimmed.slice(1, end) : trimmed.slice(1);
  }

  return trimmed.split(":", 1)[0] ?? trimmed;
}

function isPrivateBlueMapHostname(hostname: string) {
  const normalized = hostname
    .trim()
    .replace(/^\[|\]$/g, "")
    .toLowerCase();
  if (!normalized) return true;

  if (normalized === "localhost" || normalized === "::1") return true;
  if (PRIVATE_IPV4_PATTERNS.some((pattern) => pattern.test(normalized)))
    return true;
  if (/^(fc|fd)[0-9a-f:]+$/i.test(normalized)) return true;
  if (/^fe80:/i.test(normalized)) return true;
  if (
    normalized.endsWith(".local") ||
    normalized.endsWith(".lan") ||
    normalized.endsWith(".internal")
  ) {
    return true;
  }

  return false;
}

function resolveBlueMapUrl(
  rawUrl: string | undefined,
  serverHost: string | undefined,
) {
  const fallbackHost = extractServerHostname(serverHost);
  const fallback = `https://${fallbackHost}/mc-troup-map`;
  const trimmed = rawUrl?.trim() ?? "";

  if (!trimmed) return fallback;

  try {
    const url = new URL(trimmed);
    if (isPrivateBlueMapHostname(url.hostname)) return fallback;

    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}

function resolveBlueMapEmbedUrl(
  rawUrl: string | undefined,
  serverHost: string | undefined,
) {
  return `${resolveBlueMapUrl(rawUrl, serverHost).replace(/\/$/, "")}/`;
}

function normalizePathname(pathname: string) {
  const trimmed = pathname.trim();
  if (!trimmed) return "/";
  return trimmed.replace(/\/+$/, "") || "/";
}

function ensureTrailingSlash(url: string) {
  return url.endsWith("/") ? url : `${url}/`;
}

function decodePathSegment(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeHashRoute(hash: string) {
  const trimmed = hash.trim();
  if (!trimmed.startsWith("#/")) return "";
  return normalizePathname(trimmed.slice(1));
}

function resolveRoute(pathname: string, hash = ""): AppRoute {
  const normalized = normalizeHashRoute(hash) || normalizePathname(pathname);
  if (normalized === "/apps") {
    return { kind: "apps" };
  }
  if (normalized === "/music-library") {
    return { kind: "music-library" };
  }
  if (normalized === "/thoughts") {
    return { kind: "thoughts-library" };
  }
  if (normalized.startsWith("/thoughts/")) {
    const slug = decodePathSegment(
      normalized.slice("/thoughts/".length),
    ).trim();
    return slug ? { kind: "thought", slug } : { kind: "thoughts-library" };
  }
  if (normalized === "/bedtime-stories") {
    return { kind: "stories-library" };
  }
  if (normalized.startsWith("/bedtime-stories/")) {
    const slug = decodePathSegment(
      normalized.slice("/bedtime-stories/".length),
    ).trim();
    return slug ? { kind: "stories-book", slug } : { kind: "stories-library" };
  }
  return { kind: "home" };
}

function HomePageMeta() {
  usePageMeta(
    "Rasies | Family signup, apps, photos, search, chat, and Minecraft",
    "One Rasies family starting point for media signup, family account requests, apps, photos, search, chat, and Minecraft.",
  );
  return null;
}

function AppsPageMeta() {
  usePageMeta(
    "Rasies Apps | Ian's family app guide",
    "A clear Rasies app guide with sign-in apps, direct links, and the right place to start.",
  );
  return null;
}

function AppDashboard({
  signInGroups,
  directLinkGroups,
  portalUrl,
}: {
  signInGroups: AppCatalogGroup[];
  directLinkGroups: AppCatalogGroup[];
  portalUrl: string;
}) {
  const signInCount = signInGroups.reduce(
    (sum, group) => sum + group.items.length,
    0,
  );
  const directCount = directLinkGroups.reduce(
    (sum, group) => sum + group.items.length,
    0,
  );

  const renderLane = (
    title: string,
    caption: string,
    groups: AppCatalogGroup[],
  ) => (
    <div className="app-dashboard-lane">
      <div className="app-dashboard-lane-head">
        <h3>{title}</h3>
        <p>{caption}</p>
      </div>
      <div className="app-group-stack">
        {groups.map((group, index) => (
          <details key={group.id} className="app-group" open={index < 2}>
            <summary>
              <span>{group.title}</span>
              <span>{group.items.length}</span>
            </summary>
            <p>{group.description}</p>
            <div className="app-tile-grid">
              {group.items.map((item) => (
                <a
                  key={item.title}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="app-tile"
                >
                  <span className="app-tile-icon">{item.icon}</span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.note}</small>
                  </span>
                </a>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );

  return (
    <div className="app-dashboard">
      <div className="app-dashboard-top">
        <div className="app-dashboard-meter app-dashboard-meter-live">
          <span>Sign-in apps</span>
          <strong>{signInCount}</strong>
          <p>These use the family account system.</p>
        </div>
        <div className="app-dashboard-meter">
          <span>Direct links</span>
          <strong>{directCount}</strong>
          <p>Useful bookmarks that open on their own.</p>
        </div>
        <a
          href={portalUrl}
          target="_blank"
          rel="noreferrer"
          className="app-dashboard-portal"
        >
          <LayoutGrid className="h-4 w-4" />
          <span>Open app library</span>
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      </div>

      <div className="app-dashboard-columns">
        {renderLane(
          "Sign-in Apps",
          "Use your Rasies family account for these.",
          signInGroups,
        )}
        {renderLane(
          "Direct Links",
          "Quick links that do not need the same sign-in flow.",
          directLinkGroups,
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [configError, setConfigError] = useState<string | null>(null);
  const [buildTag, setBuildTag] = useState<string | null>(null);
  const [locationState, setLocationState] = useState(() =>
    typeof window === "undefined"
      ? { pathname: "/", hash: "" }
      : { pathname: window.location.pathname, hash: window.location.hash },
  );
  const route = resolveRoute(locationState.pathname, locationState.hash);

  useEffect(() => {
    if (typeof window === "undefined") return () => undefined;

    const syncLocation = () => {
      setLocationState({
        pathname: window.location.pathname,
        hash: window.location.hash,
      });
    };

    window.addEventListener("popstate", syncLocation);
    window.addEventListener("hashchange", syncLocation);
    return () => {
      window.removeEventListener("popstate", syncLocation);
      window.removeEventListener("hashchange", syncLocation);
    };
  }, []);

  useEffect(() => {
    let active = true;

    fetch("/api/config", { cache: "no-store" })
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)),
      )
      .then((data: Partial<Config>) => {
        if (!active) return;
        const mcTroupServerHost =
          data.mcTroupServerHost ?? defaultConfig.mcTroupServerHost;
        const mcTroupBlueMapUrl = resolveBlueMapUrl(
          data.mcTroupBlueMapUrl,
          mcTroupServerHost,
        );
        setConfig({
          publicBaseUrl: data.publicBaseUrl ?? defaultConfig.publicBaseUrl,
          personalSiteUrl:
            data.personalSiteUrl ?? defaultConfig.personalSiteUrl,
          heimdallUrl: data.heimdallUrl ?? defaultConfig.heimdallUrl,
          searchUrl: data.searchUrl ?? defaultConfig.searchUrl,
          glanceUrl: data.glanceUrl ?? defaultConfig.glanceUrl,
          gamesUrl: data.gamesUrl ?? defaultConfig.gamesUrl,
          authentikUrl: data.authentikUrl ?? defaultConfig.authentikUrl,
          signupUrl: data.signupUrl ?? defaultConfig.signupUrl,
          plexUrl: data.plexUrl ?? defaultConfig.plexUrl,
          signupEnabled: Boolean(
            data.signupEnabled ?? defaultConfig.signupEnabled,
          ),
          dataUrl: data.dataUrl ?? defaultConfig.dataUrl,
          photosUrl: data.photosUrl ?? defaultConfig.photosUrl,
          sendUrl: data.sendUrl ?? defaultConfig.sendUrl,
          gristUrl: data.gristUrl ?? defaultConfig.gristUrl,
          drawUrl: data.drawUrl ?? defaultConfig.drawUrl,
          affineUrl: data.affineUrl ?? defaultConfig.affineUrl,
          mcTroupServerHost,
          mcTroupBlueMapUrl,
          mcTroupBlueMapEmbedUrl:
            data.mcTroupBlueMapEmbedUrl ??
            resolveBlueMapEmbedUrl(data.mcTroupBlueMapUrl, mcTroupServerHost),
          about: sanitizeAbout(data.about),
        });
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message = err instanceof Error ? err.message : "Unknown error";
        setConfigError(
          `This page is using backup settings for the moment (${message}).`,
        );
      });

    fetch("/api/version", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { buildTag?: string } | null) => {
        if (!active || !data?.buildTag) return;
        setBuildTag(data.buildTag);
      })
      .catch(() => {
        /* optional */
      });

    return () => {
      active = false;
    };
  }, []);

  const authentikEntryUrl = ensureTrailingSlash(config.authentikUrl);
  const accountRequestUrl = FAMILY_ACCOUNT_REQUEST_URL;
  const familyPortalUrl = FAMILY_APP_LIBRARY_URL;
  const searchUrl = ensureTrailingSlash(config.searchUrl);
  const photosUrl = ensureTrailingSlash(config.photosUrl);
  const signupUrl = MEDIA_SIGNUP_DIRECT_URL;
  const publicBaseLabel = config.publicBaseUrl.replace(/^https?:\/\//, "");
  const appsGuideUrl = "/#/apps";

  const startHereLinks = useMemo<ServiceLink[]>(
    () => [
      {
        title: "Media signup",
        description:
          "Use the Rasies media invite for Plex, books, audiobooks, and music.",
        href: signupUrl,
        icon: <Headphones className="h-4 w-4" />,
        badge: "Media only",
        tone: "live",
        note: "signup.rasies.com/j/RASIES",
      },
      {
        title: "Request family account",
        description:
          "Join the waitlist for photos, files, notes, planning, and apps.",
        href: accountRequestUrl,
        icon: <LockKeyhole className="h-4 w-4" />,
        badge: "Waitlist",
        tone: "live",
        note: "auth.rasies.com waitlist",
      },
      {
        title: "Open family apps",
        description: "Open the approved Authentik app library.",
        href: familyPortalUrl,
        icon: <LayoutGrid className="h-4 w-4" />,
        badge: "Approved",
        note: "auth.rasies.com library",
      },
      {
        title: "All apps guide",
        description:
          "See the family apps grouped by sign-in apps and direct links.",
        href: appsGuideUrl,
        icon: <Compass className="h-4 w-4" />,
        note: "This site",
      },
    ],
    [accountRequestUrl, familyPortalUrl, signupUrl],
  );

  const familyAccessLinks = useMemo<ServiceLink[]>(
    () => startHereLinks.filter((link) => link.title !== "Media signup"),
    [startHereLinks],
  );

  const helpfulServiceLinks = useMemo<ServiceLink[]>(
    () => [
      {
        title: "PDF",
        description: "Fix, split, merge, and clean up PDFs.",
        href: "https://pdf.rasies.com",
        icon: <FileText className="h-4 w-4" />,
        note: "pdf.rasies.com",
      },
      {
        title: "Send",
        description: "Quick temporary file sharing.",
        href: config.sendUrl,
        icon: <Send className="h-4 w-4" />,
        note: "send.rasies.com",
      },
      {
        title: "Diagram",
        description: "Make clean diagrams and flowcharts.",
        href: "https://diagram.rasies.com",
        icon: <Map className="h-4 w-4" />,
        note: "diagram.rasies.com",
      },
      {
        title: "Draw",
        description: "Sketch ideas on a simple whiteboard.",
        href: config.drawUrl,
        icon: <PenTool className="h-4 w-4" />,
        note: "draw.rasies.com",
      },
      {
        title: "Games",
        description: "A little fun after the useful stuff.",
        href: "https://games.rasies.com",
        icon: <Gamepad2 className="h-4 w-4" />,
        note: "games.rasies.com",
      },
    ],
    [config.drawUrl, config.sendUrl],
  );

  const signInAppGroups = useMemo<AppCatalogGroup[]>(
    () => [
      {
        id: "signin-memories-files",
        title: "Memories & Files",
        description: "Photos, family tree, files, and shared knowledge.",
        kind: "sign-in",
        items: [
          {
            title: "Immich",
            href: photosUrl,
            icon: <Compass className="h-4 w-4" />,
            note: "Family photos and videos",
          },
          {
            title: "Gramps Web",
            href: "https://family.rasies.com",
            icon: <Map className="h-4 w-4" />,
            note: "Family tree and records",
          },
          {
            title: "Nextcloud",
            href: config.dataUrl,
            icon: <LayoutGrid className="h-4 w-4" />,
            note: "Files and calendars",
          },
          {
            title: "Outline",
            href: "https://outline.rasies.com",
            icon: <BookOpen className="h-4 w-4" />,
            note: "Shared notes and docs",
          },
        ],
      },
      {
        id: "signin-reading-media",
        title: "Reading & Media",
        description: "Listening and feeds that use the family sign-in.",
        kind: "sign-in",
        items: [
          {
            title: "Audiobookshelf",
            href: "https://audio.rasies.com",
            icon: <Headphones className="h-4 w-4" />,
            note: "Audiobooks and podcasts",
          },
          {
            title: "Miniflux",
            href: "https://feeds.rasies.com",
            icon: <BookOpen className="h-4 w-4" />,
            note: "Clean RSS reading",
          },
        ],
      },
      {
        id: "signin-plans-tools",
        title: "Plans & Tools",
        description:
          "Planning, saved links, lists, and structured family work.",
        kind: "sign-in",
        items: [
          {
            title: "Grist",
            href: config.gristUrl,
            icon: <LayoutGrid className="h-4 w-4" />,
            note: "Trackers and tables",
          },
          {
            title: "Linkwarden",
            href: "https://links.rasies.com",
            icon: <Compass className="h-4 w-4" />,
            note: "Saved links",
          },
          {
            title: "Vikunja",
            href: "https://do.rasies.com",
            icon: <LayoutGrid className="h-4 w-4" />,
            note: "Tasks and projects",
          },
        ],
      },
      {
        id: "signin-create-explore",
        title: "Create & Explore",
        description: "AI tools for people with access.",
        kind: "sign-in",
        items: [
          {
            title: "Open WebUI",
            href: "https://oi.rasies.com",
            icon: <MessageSquare className="h-4 w-4" />,
            note: "AI chat and tools",
          },
        ],
      },
      {
        id: "signin-private-secure",
        title: "Private & Secure",
        description: "Sensitive dashboards and password tools.",
        kind: "sign-in",
        items: [
          {
            title: "Grafana",
            href: "https://grafana.rasies.com",
            icon: <ShieldCheck className="h-4 w-4" />,
            note: "Metrics and graphs",
          },
          {
            title: "Vaultwarden",
            href: "https://passwords.rasies.com",
            icon: <ShieldCheck className="h-4 w-4" />,
            note: "Passwords and secure notes",
          },
        ],
      },
    ],
    [config.dataUrl, config.gristUrl, photosUrl],
  );

  const directLinkGroups = useMemo<AppCatalogGroup[]>(
    () => [
      {
        id: "direct-memories-files",
        title: "Memories & Files",
        description: "Useful bookmarks for quick notes and memory work.",
        kind: "direct",
        items: [
          {
            title: "Memos",
            href: "https://memos.rasies.com",
            icon: <MessageSquare className="h-4 w-4" />,
            note: "Quick notes",
          },
        ],
      },
      {
        id: "direct-reading-media",
        title: "Reading & Media",
        description: "Media shelves and reading tools linked from the portal.",
        kind: "direct",
        items: [
          {
            title: "Kavita",
            href: "https://books.rasies.com",
            icon: <BookOpen className="h-4 w-4" />,
            note: "Books and reading",
          },
          {
            title: "Komga",
            href: "https://komga.rasies.com",
            icon: <BookOpen className="h-4 w-4" />,
            note: "Comics and illustrated shelves",
          },
          {
            title: "mStream",
            href: "https://music.rasies.com",
            icon: <Headphones className="h-4 w-4" />,
            note: "Music streaming",
          },
          {
            title: "wallabag",
            href: "https://wallabag.rasies.com",
            icon: <BookOpen className="h-4 w-4" />,
            note: "Read-it-later",
          },
        ],
      },
      {
        id: "direct-plans-tools",
        title: "Plans & Tools",
        description: "Search, dashboards, habits, links, and quick sharing.",
        kind: "direct",
        items: [
          {
            title: "Glance",
            href: config.glanceUrl,
            icon: <LayoutGrid className="h-4 w-4" />,
            note: "House dashboard",
          },
          {
            title: "HabitTrove",
            href: "https://habits.rasies.com",
            icon: <Sparkles className="h-4 w-4" />,
            note: "Habits and routines",
          },
          {
            title: "SearXNG Search",
            href: searchUrl,
            icon: <Search className="h-4 w-4" />,
            note: "Private-ish search",
          },
          {
            title: "Send",
            href: config.sendUrl,
            icon: <Sparkles className="h-4 w-4" />,
            note: "Temporary file sharing",
          },
        ],
      },
      {
        id: "direct-create-explore",
        title: "Create & Explore",
        description: "Whiteboards, diagrams, and flexible creative work.",
        kind: "direct",
        items: [
          {
            title: "AFFiNE",
            href: config.affineUrl,
            icon: <BookOpen className="h-4 w-4" />,
            note: "Docs and whiteboards",
          },
          {
            title: "Draw.io",
            href: "https://diagram.rasies.com",
            icon: <Map className="h-4 w-4" />,
            note: "Diagrams",
          },
          {
            title: "Excalidraw",
            href: config.drawUrl,
            icon: <Map className="h-4 w-4" />,
            note: "Sketches and whiteboards",
          },
        ],
      },
      {
        id: "direct-useful-tools",
        title: "Useful Tools",
        description:
          "Automation, monitoring, data, PDFs, and small power tools.",
        kind: "direct",
        items: [
          {
            title: "Activepieces",
            href: "https://active.rasies.com",
            icon: <Sparkles className="h-4 w-4" />,
            note: "Automation builder",
          },
          {
            title: "Beszel",
            href: "https://monitor.rasies.com",
            icon: <ShieldCheck className="h-4 w-4" />,
            note: "Service monitoring",
          },
          {
            title: "Metabase",
            href: "https://metabase.rasies.com",
            icon: <LayoutGrid className="h-4 w-4" />,
            note: "Data dashboards",
          },
          {
            title: "NocoDB",
            href: "https://db.rasies.com",
            icon: <LayoutGrid className="h-4 w-4" />,
            note: "Simple databases",
          },
          {
            title: "Stirling PDF",
            href: "https://pdf.rasies.com",
            icon: <BookOpen className="h-4 w-4" />,
            note: "PDF tools",
          },
          {
            title: "n8n",
            href: "https://n8n.rasies.com",
            icon: <Sparkles className="h-4 w-4" />,
            note: "Automation workflows",
          },
        ],
      },
    ],
    [
      config.affineUrl,
      config.drawUrl,
      config.glanceUrl,
      config.sendUrl,
      searchUrl,
    ],
  );

  const builtInLinks = useMemo<ServiceLink[]>(
    () => [
      {
        title: "Notes",
        description: "Longer notes, updates, and things I want to keep handy.",
        href: "/thoughts",
        icon: <MessageSquare className="h-4 w-4" />,
        note: "On this site",
      },
      {
        title: "Bedtime Stories",
        description: "The family podcast shelf.",
        href: "/bedtime-stories",
        icon: <BookOpen className="h-4 w-4" />,
        note: "On this site",
      },
      {
        title: "Listening room",
        description: "The music shelf that lives right on this site.",
        href: "/music-library",
        icon: <Headphones className="h-4 w-4" />,
        note: "On this site",
      },
      {
        title: "Game room",
        description: "The retro corner.",
        href: config.gamesUrl,
        icon: <Sparkles className="h-4 w-4" />,
        note: "gba.rasies.com",
      },
    ],
    [config.gamesUrl],
  );

  const photoCtaLinks = useMemo<ServiceLink[]>(
    () => [
      {
        title: "Open Immich",
        description: "Go to the family photos and videos.",
        href: photosUrl,
        icon: <Compass className="h-4 w-4" />,
        badge: "Photos",
        tone: "live",
        note: "photos.rasies.com",
      },
      {
        title: "Request family account",
        description: "Ask for access if Immich does not open for you yet.",
        href: accountRequestUrl,
        icon: <LockKeyhole className="h-4 w-4" />,
        badge: "Ask for access",
        note: "auth.rasies.com waitlist",
      },
      {
        title: "Open app library",
        description: "Jump to the Authentik app library after approval.",
        href: familyPortalUrl,
        icon: <LayoutGrid className="h-4 w-4" />,
        note: "auth.rasies.com library",
      },
    ],
    [accountRequestUrl, familyPortalUrl, photosUrl],
  );

  if (route.kind === "stories-library") {
    return (
      <div className="site-shell">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <BedtimeStoriesLibraryPage />
      </div>
    );
  }

  if (route.kind === "stories-book") {
    return (
      <div className="site-shell">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <BedtimeStoryPage slug={route.slug} />
      </div>
    );
  }

  if (route.kind === "music-library") {
    return (
      <div className="site-shell">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <MusicLibraryPage />
      </div>
    );
  }

  if (route.kind === "thoughts-library") {
    return (
      <div className="site-shell">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <ThoughtsLibraryPage />
      </div>
    );
  }

  if (route.kind === "thought") {
    return (
      <div className="site-shell">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <ThoughtPage slug={route.slug} />
      </div>
    );
  }

  if (route.kind === "apps") {
    return (
      <div className="site-shell">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>

        <main
          id="main-content"
          className="site-main"
          data-build={buildTag ?? undefined}
        >
          <AppsPageMeta />
          <nav className="quick-nav reveal reveal-1" aria-label="Page sections">
            <a href="/">Home</a>
            <a href="#doors">Start</a>
            <a href="#auth-apps">Auth apps</a>
            <a href="#built-in">On this site</a>
            <a href="#house-notes">House note</a>
          </nav>

          <header className="hero hero-workshop reveal reveal-1">
            <div className="hero-grid">
              <div className="hero-copy-stack">
                <p className="hero-eyebrow">Rasies apps guide</p>
                <h1>The app map, without the guessing.</h1>
                <p className="hero-copy">
                  Use the waitlist when you need the full family account. Once I
                  approve it, the Authentik app library is the dashboard. Some
                  things use the family sign-in, and some are just useful links
                  gathered in one place.
                </p>
                <p className="hero-copy hero-copy-secondary">
                  Media-only signup stays separate at signup.rasies.com. This
                  page is for the broader family suite.
                </p>

                <div className="hero-actions">
                  <a
                    href={signupUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary"
                  >
                    <Headphones className="h-4 w-4" />
                    Media signup
                  </a>
                  <a
                    href={accountRequestUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost"
                  >
                    <LockKeyhole className="h-4 w-4" />
                    Request family account
                  </a>
                  <a
                    href={familyPortalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost"
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Open app library
                  </a>
                  <a href="/" className="btn btn-ghost">
                    <Compass className="h-4 w-4" />
                    Back to home
                  </a>
                </div>
              </div>
            </div>
          </header>

          {configError && <div className="inline-notice">{configError}</div>}

          <section
            id="doors"
            className="panel panel-wide reveal reveal-2"
            aria-labelledby="doors-heading"
          >
            <div className="section-head">
              <LockKeyhole className="h-5 w-5" aria-hidden />
              <div>
                <h2 id="doors-heading">Start with the right door</h2>
                <p>
                  Media signup and full family access are two different paths.
                  Pick the one that fits what you need.
                </p>
              </div>
            </div>
            <ServiceLaunchpad links={startHereLinks} />
          </section>

          <section
            id="auth-apps"
            className="panel panel-wide app-dashboard-panel reveal reveal-3"
            aria-labelledby="auth-apps-heading"
          >
            <div className="section-head">
              <LayoutGrid className="h-5 w-5" aria-hidden />
              <div>
                <h2 id="auth-apps-heading">Family app library</h2>
                <p>
                  Sign-in apps and direct links are grouped separately so the
                  dashboard stays easy to scan.
                </p>
              </div>
            </div>
            <AppDashboard
              signInGroups={signInAppGroups}
              directLinkGroups={directLinkGroups}
              portalUrl={familyPortalUrl}
            />
          </section>

          <section
            id="built-in"
            className="panel panel-wide reveal reveal-4"
            aria-labelledby="built-in-heading"
          >
            <div className="section-head">
              <Sparkles className="h-5 w-5" aria-hidden />
              <div>
                <h2 id="built-in-heading">On this site</h2>
                <p>
                  These live directly on rasies.com, outside the approved app
                  library.
                </p>
              </div>
            </div>
            <ServiceLaunchpad links={builtInLinks} />
          </section>

          <section
            id="house-notes"
            className="panel panel-wide reveal reveal-6"
            aria-labelledby="apps-house-notes-heading"
          >
            <div className="section-head">
              <Compass className="h-5 w-5" aria-hidden />
              <div>
                <h2 id="apps-house-notes-heading">A note from this house</h2>
                <p>
                  Nobody should have to remember software names to use this. The
                  goal is simple: open the page, find the right door, and get on
                  with the family stuff.
                </p>
              </div>
            </div>
            <div className="manifesto-grid">
              <AboutPanel about={config.about} />
              <StatusPanel compact />
            </div>
          </section>

          <footer className="footer-stack reveal reveal-6">
            <div className="site-footer">
              <span>{publicBaseLabel}</span>
              <span>
                Media signup, family access, and the app library all live here.
              </span>
            </div>
          </footer>
        </main>
      </div>
    );
  }

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <main
        id="main-content"
        className="site-main"
        data-build={buildTag ?? undefined}
      >
        <HomePageMeta />
        <nav className="quick-nav reveal reveal-1" aria-label="Page sections">
          <a href="#start">Start</a>
          <a href="#helpful-services">Tools</a>
          <a href="#notes">Notes</a>
          <a href="#chat">Chat</a>
          <a href="#media-signup">Media</a>
          <a href="#family-request">Family</a>
          <a href="#self-hosted-apps">Apps</a>
          <a href="#minecraft">Minecraft</a>
        </nav>

        <header id="start" className="hero hero-workshop reveal reveal-1">
          <div className="hero-grid">
            <div className="hero-copy-stack">
              <p className="hero-eyebrow">Rasies family site</p>
              <h1>Family, start here.</h1>
              <p className="hero-copy">
                This is the front door for our family apps, media, photos,
                notes, chat, search, and the Minecraft world. Pick the button
                that matches what you need and you should be in the right place.
              </p>
              <p className="hero-copy hero-copy-secondary">
                Media access is quick and separate. Full family access covers
                the bigger set of tools, so it starts with the waitlist.
              </p>

              <div className="home-signup-grid" aria-label="Signup choices">
                <a
                  href={signupUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="home-signup-card home-signup-card-media"
                >
                  <span className="home-signup-icon">
                    <Headphones className="h-6 w-6" aria-hidden />
                  </span>
                  <span className="home-signup-copy">
                    <strong>Media signup</strong>
                    <small>signup.rasies.com/j/RASIES</small>
                    <em>Plex, books, audiobooks, and music.</em>
                  </span>
                  <ExternalLink className="home-signup-arrow h-5 w-5" />
                </a>
                <a
                  href={accountRequestUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="home-signup-card home-signup-card-family"
                >
                  <span className="home-signup-icon">
                    <LockKeyhole className="h-6 w-6" aria-hidden />
                  </span>
                  <span className="home-signup-copy">
                    <strong>Full family access</strong>
                    <small>auth.rasies.com waitlist</small>
                    <em>Photos, files, notes, planning, and approved apps.</em>
                  </span>
                  <ExternalLink className="home-signup-arrow h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
        </header>

        <section
          id="helpful-services"
          className="helpful-service-bar reveal reveal-2"
          aria-labelledby="helpful-services-heading"
        >
          <div className="helpful-service-bar-head">
            <Sparkles className="h-4 w-4" aria-hidden />
            <h2 id="helpful-services-heading">Helpful quick links</h2>
          </div>
          <div className="helpful-service-links">
            {helpfulServiceLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="helpful-service-link"
              >
                <span>{link.icon}</span>
                <strong>{link.title}</strong>
                <small>{link.note}</small>
              </a>
            ))}
          </div>
        </section>

        {configError && <div className="inline-notice">{configError}</div>}

        <section
          id="notes"
          className="home-band reveal reveal-2"
          aria-labelledby="notes-heading"
        >
          <div className="home-band-head">
            <p className="card-kicker">Notes</p>
            <h2 id="notes-heading">Notes I want easy to find</h2>
          </div>
          <ThoughtsHighlight />
        </section>

        <section
          id="chat"
          className="chat-minimal-band reveal reveal-3"
          aria-label="House Chat"
        >
          <ChatPanel variant="minimal" />
        </section>

        <section
          id="search"
          className="panel panel-wide reveal reveal-4"
          aria-labelledby="search-heading"
        >
          <div className="section-head">
            <Search className="h-5 w-5" aria-hidden />
            <div>
              <h2 id="search-heading">Search</h2>
              <p>
                A clean search box for looking things up without leaving home.
              </p>
            </div>
          </div>
          <SearchPanel />
        </section>

        <section
          id="media-signup"
          className="account-hero account-hero-media reveal reveal-5"
          aria-labelledby="media-signup-heading"
        >
          <div className="section-head">
            <Headphones className="h-5 w-5" aria-hidden />
            <div>
              <h2 id="media-signup-heading">Media services signup</h2>
              <p>
                If you only want movies, books, audiobooks, or music, create a
                live Rasies media invite here. Family app access stays in the
                waitlist lane.
              </p>
            </div>
          </div>
          <FamilyAccessPanel
            signupUrl={signupUrl}
            authentikUrl={authentikEntryUrl}
            accountRequestUrl={accountRequestUrl}
            signupEnabled={config.signupEnabled}
            links={familyAccessLinks}
          />
        </section>

        <BirthdayEasterEgg gameUrl={config.gamesUrl} />

        <section
          id="self-hosted-apps"
          className="panel panel-wide app-dashboard-panel reveal reveal-6"
          aria-labelledby="self-hosted-apps-heading"
        >
          <div className="section-head">
            <LayoutGrid className="h-5 w-5" aria-hidden />
            <div>
              <h2 id="self-hosted-apps-heading">Self-hosted apps</h2>
              <p>
                One springboard for the family apps, with sign-in apps kept
                separate from direct links.
              </p>
            </div>
          </div>
          <AppDashboard
            signInGroups={signInAppGroups}
            directLinkGroups={directLinkGroups}
            portalUrl={familyPortalUrl}
          />
          <div className="manifesto-actions">
            <a href={appsGuideUrl} className="btn btn-primary">
              <Compass className="h-4 w-4" />
              Open full apps guide
            </a>
            <a
              href={familyPortalUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost"
            >
              <LayoutGrid className="h-4 w-4" />
              Open app library
            </a>
          </div>
        </section>

        <section
          id="photos"
          className="panel panel-wide reveal reveal-5"
          aria-labelledby="photos-heading"
        >
          <div className="section-head">
            <Compass className="h-5 w-5" aria-hidden />
            <div>
              <h2 id="photos-heading">Immich photo library</h2>
              <p>
                Family photos and videos live in Immich. Use this when you want
                to get to them quickly.
              </p>
            </div>
          </div>
          <ServiceLaunchpad links={photoCtaLinks} />
          <p className="manifesto-note">
            If Immich does not open for you yet, ask me for the full family
            account through the Rasies waitlist.
          </p>
        </section>

        <section
          id="minecraft"
          className="panel panel-wide reveal reveal-5"
          aria-labelledby="minecraft-heading"
        >
          <div className="section-head">
            <Map className="h-5 w-5" aria-hidden />
            <div>
              <h2 id="minecraft-heading">Come and play Minecraft anytime</h2>
              <p>
                The live map, server address, and build bot are here so you can
                jump into Big Momma Ras Land whenever you want.
              </p>
            </div>
          </div>
          <MinecraftPanel
            serverHost={config.mcTroupServerHost}
            blueMapUrl={config.mcTroupBlueMapUrl}
            blueMapEmbedUrl={config.mcTroupBlueMapEmbedUrl}
          />
        </section>

        <section
          id="podcasts"
          className="home-band reveal reveal-6"
          aria-labelledby="podcasts-heading"
        >
          <div className="home-band-head">
            <p className="card-kicker">Podcasts</p>
            <h2 id="podcasts-heading">The listening shelf is here too</h2>
          </div>
          <BedtimeStoriesHighlight />
        </section>

        <footer className="footer-stack reveal reveal-6">
          <div className="site-footer">
            <span>{publicBaseLabel}</span>
            <span>
              Built for our family: media at signup.rasies.com/j/RASIES, full
              access through the waitlist, and approved apps in Authentik.
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}
