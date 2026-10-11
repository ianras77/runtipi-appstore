import { describe, expect, it } from 'vitest';
import { Env } from './env.js';
import { buildTargets, classifyProbeResponse } from './status.js';

describe('buildTargets', () => {
  it('uses a public BlueMap URL when the configured target is private', () => {
    const env = {
      PORT: 3000,
      PUBLIC_BASE_URL: 'https://www.rasies.com',
      PUBLIC_PROBE_URL: undefined,
      PERSONAL_SITE_URL: 'https://rassys.com',
      MC_TROUP_SERVER_HOST: 'crafty.rasies.com:25565',
      MC_TROUP_BLUEMAP_URL: 'http://192.168.100.10:8100',
      MC_TROUP_BLUEMAP_PROXY_PATH: '/mc-troup-map',
      SEARXNG_BASE_URL: 'https://search.rasies.com',
      SEARXNG_PATH: '/search',
      SEARXNG_TIMEOUT_MS: 9000,
      CAT_BASE_URL: 'http://rasies-cheshire-cat:80',
      CAT_PUBLIC_URL: undefined,
      CAT_CHAT_PATH: '/message',
      CAT_TIMEOUT_MS: 60000,
      CAT_MODEL: 'gpt-oss:20b',
      STATUS_TIMEOUT_MS: 4000,
      ALLOWED_ORIGINS: 'https://www.rasies.com',
      HEIMDALL_URL: 'https://apps.rasies.com',
      GLANCE_URL: 'https://glance.rasies.com',
      GAMES_URL: 'https://gba.rasies.com',
      AUTHENTIK_URL: 'https://auth.rasies.com/',
      SIGNUP_URL: 'https://signup.rasies.com',
      PLEX_URL: 'https://plex.rasies.com',
      WIZARR_BASE_URL: 'https://signup.rasies.com',
      WIZARR_API_KEY: '',
      WIZARR_PLEX_SERVER_IDS: '',
      WIZARR_INVITE_EXPIRES_DAYS: 30,
      WIZARR_INVITE_DURATION: 'unlimited',
      WIZARR_TIMEOUT_MS: 10000,
      DATA_URL: 'https://data.rasies.com',
      PHOTOS_URL: 'https://photos.rasies.com',
      SEND_URL: 'https://send.rasies.com',
      GRIST_URL: 'https://grist.rasies.com',
      DRAW_URL: 'https://draw.rasies.com',
      AFFINE_URL: 'https://affine.rasies.com',
      ABOUT_NAME: 'Rassy',
      ABOUT_TAGLINE: 'Builder',
      ABOUT_BIO: 'Bio',
      ABOUT_HIGHLIGHTS: 'One,Two'
    } as Env;

    const mcTarget = buildTargets(env).find((target) => target.key === 'mc-troup');
    expect(mcTarget?.url).toBe('https://crafty.rasies.com/mc-troup-map');
    const signupTarget = buildTargets(env).find((target) => target.key === 'signup');
    expect(signupTarget?.url).toBe('https://signup.rasies.com');
  });

  it('routes Smart Chat status links through the portal when no external cat UI is configured', () => {
    const env = {
      PORT: 3000,
      PUBLIC_BASE_URL: 'https://www.rasies.com',
      PUBLIC_PROBE_URL: undefined,
      PERSONAL_SITE_URL: 'https://rassys.com',
      MC_TROUP_SERVER_HOST: 'crafty.rasies.com:25565',
      MC_TROUP_BLUEMAP_URL: 'https://crafty.rasies.com/mc-troup-map',
      MC_TROUP_BLUEMAP_PROXY_PATH: '/mc-troup-map',
      SEARXNG_BASE_URL: 'https://search.rasies.com',
      SEARXNG_PATH: '/search',
      SEARXNG_TIMEOUT_MS: 9000,
      CAT_BASE_URL: 'http://rasies-cheshire-cat:80',
      CAT_PUBLIC_URL: undefined,
      CAT_CHAT_PATH: '/message',
      CAT_TIMEOUT_MS: 60000,
      CAT_MODEL: 'gpt-oss:20b',
      STATUS_TIMEOUT_MS: 4000,
      ALLOWED_ORIGINS: 'https://www.rasies.com',
      HEIMDALL_URL: 'https://apps.rasies.com',
      GLANCE_URL: 'https://glance.rasies.com',
      GAMES_URL: 'https://gba.rasies.com',
      AUTHENTIK_URL: 'https://auth.rasies.com/',
      SIGNUP_URL: 'https://signup.rasies.com',
      PLEX_URL: 'https://plex.rasies.com',
      WIZARR_BASE_URL: 'https://signup.rasies.com',
      WIZARR_API_KEY: '',
      WIZARR_PLEX_SERVER_IDS: '',
      WIZARR_INVITE_EXPIRES_DAYS: 30,
      WIZARR_INVITE_DURATION: 'unlimited',
      WIZARR_TIMEOUT_MS: 10000,
      DATA_URL: 'https://data.rasies.com',
      PHOTOS_URL: 'https://photos.rasies.com',
      SEND_URL: 'https://send.rasies.com',
      GRIST_URL: 'https://grist.rasies.com',
      DRAW_URL: 'https://draw.rasies.com',
      AFFINE_URL: 'https://affine.rasies.com',
      ABOUT_NAME: 'Rassy',
      ABOUT_TAGLINE: 'Builder',
      ABOUT_BIO: 'Bio',
      ABOUT_HIGHLIGHTS: 'One,Two'
    } as Env;

    const chatTarget = buildTargets(env).find((target) => target.key === 'chat');
    expect(chatTarget?.url).toBe('https://www.rasies.com/#chat');
    expect(chatTarget?.probeUrl).toBe('https://www.rasies.com/api/cat/health');
  });

  it('uses the probe origin for in-app Smart Chat health checks when available', () => {
    const env = {
      PORT: 3000,
      PUBLIC_BASE_URL: 'https://www.rasies.com',
      PUBLIC_PROBE_URL: 'http://127.0.0.1:3000',
      PERSONAL_SITE_URL: 'https://rassys.com',
      MC_TROUP_SERVER_HOST: 'crafty.rasies.com:25565',
      MC_TROUP_BLUEMAP_URL: 'https://crafty.rasies.com/mc-troup-map',
      MC_TROUP_BLUEMAP_PROXY_PATH: '/mc-troup-map',
      SEARXNG_BASE_URL: 'https://search.rasies.com',
      SEARXNG_PATH: '/search',
      SEARXNG_TIMEOUT_MS: 9000,
      CAT_BASE_URL: 'http://rasies-cheshire-cat:80',
      CAT_PUBLIC_URL: undefined,
      CAT_CHAT_PATH: '/message',
      CAT_TIMEOUT_MS: 60000,
      CAT_MODEL: 'gpt-oss:20b',
      STATUS_TIMEOUT_MS: 4000,
      ALLOWED_ORIGINS: 'https://www.rasies.com',
      HEIMDALL_URL: 'https://apps.rasies.com',
      GLANCE_URL: 'https://glance.rasies.com',
      GAMES_URL: 'https://gba.rasies.com',
      AUTHENTIK_URL: 'https://auth.rasies.com/',
      SIGNUP_URL: 'https://signup.rasies.com',
      PLEX_URL: 'https://plex.rasies.com',
      WIZARR_BASE_URL: 'https://signup.rasies.com',
      WIZARR_API_KEY: '',
      WIZARR_PLEX_SERVER_IDS: '',
      WIZARR_INVITE_EXPIRES_DAYS: 30,
      WIZARR_INVITE_DURATION: 'unlimited',
      WIZARR_TIMEOUT_MS: 10000,
      DATA_URL: 'https://data.rasies.com',
      PHOTOS_URL: 'https://photos.rasies.com',
      SEND_URL: 'https://send.rasies.com',
      GRIST_URL: 'https://grist.rasies.com',
      DRAW_URL: 'https://draw.rasies.com',
      AFFINE_URL: 'https://affine.rasies.com',
      ABOUT_NAME: 'Rassy',
      ABOUT_TAGLINE: 'Builder',
      ABOUT_BIO: 'Bio',
      ABOUT_HIGHLIGHTS: 'One,Two'
    } as Env;

    const chatTarget = buildTargets(env).find((target) => target.key === 'chat');
    expect(chatTarget?.url).toBe('https://www.rasies.com/#chat');
    expect(chatTarget?.probeUrl).toBe('http://127.0.0.1:3000/api/cat/health');
  });

  it('warns when the signup lane redirects into Authentik', () => {
    const target = {
      key: 'signup',
      label: 'Family Signup Lane',
      url: 'https://signup.rasies.com'
    };

    expect(
      classifyProbeResponse(
        target,
        302,
        'https://auth.rasies.com/if/flow/runtipi-waitlist-enrollment/',
        'https://auth.rasies.com/'
      )
    ).toEqual({
      state: 'warn',
      detail: 'signup.rasies.com is landing on Authentik instead of Wizarr.'
    });
  });
});
