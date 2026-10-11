import { describe, expect, it, vi } from 'vitest';
import type { request as undiciRequest } from 'undici';
import { Env } from './env.js';
import {
  createSignupInvite,
  fetchSignupServices,
  findInvitationByCode,
  normalizeInviteUrl,
  parseIntegerList,
  resolveSignupServerIds
} from './signup.js';

type RequestFn = typeof undiciRequest;

function buildEnv(overrides: Partial<Env> = {}): Env {
  return {
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
    CAT_API_KEY: '',
    STATUS_TIMEOUT_MS: 4000,
    ALLOWED_ORIGINS: 'https://www.rasies.com',
    HEIMDALL_URL: 'https://apps.rasies.com',
    GLANCE_URL: 'https://glance.rasies.com',
    GAMES_URL: 'https://gba.rasies.com',
    AUTHENTIK_URL: 'https://auth.rasies.com/',
    SIGNUP_URL: 'https://signup.rasies.com',
    PLEX_URL: 'https://plex.rasies.com',
    WIZARR_BASE_URL: 'https://signup.rasies.com',
    WIZARR_API_KEY: 'test-key',
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
    BEDTIME_STORIES_ROOT: '/stories',
    BEDTIME_STORIES_SHOW_TITLE: 'Real Life Bedtime Stories',
    BEDTIME_STORIES_SHOW_SUBTITLE: 'Books I recorded for my daughter, one cozy chapter at a time.',
    BEDTIME_STORIES_SHOW_DESCRIPTION:
      'A family podcast shelf of bedtime stories read by Rassy, with each book arranged as its own cozy season.',
    BEDTIME_STORIES_SHOW_AUTHOR: 'Rassy',
    BEDTIME_STORIES_SHOW_LANGUAGE: 'en-US',
    BEDTIME_STORIES_OWNER_NAME: 'Rassy',
    BEDTIME_STORIES_OWNER_EMAIL: '',
    BEDTIME_STORIES_AMAZON_TAG: '',
    THOUGHTS_ROOT: '/thoughts',
    MR_RASSY_SOUNDS_ROOT: '/mr-rassy-sounds',
    MUSIC_LIBRARY_ROOT: '/music-library',
    ABOUT_NAME: 'Rassy',
    ABOUT_TAGLINE: 'Builder',
    ABOUT_BIO: 'Bio',
    ABOUT_HIGHLIGHTS: 'One,Two',
    ...overrides
  };
}

describe('signup helpers', () => {
  it('parses comma-separated numeric ids safely', () => {
    expect(parseIntegerList('1, 2, nope, 2, 0, -4, 7')).toEqual([1, 2, 7]);
    expect(parseIntegerList('')).toEqual([]);
  });

  it('normalizes invite urls to the public signup origin', () => {
    expect(
      normalizeInviteUrl('http://signup.rasies.com/j/ABC123', 'https://signup.rasies.com')
    ).toBe('https://signup.rasies.com/j/ABC123');
  });

  it('uses explicit invite server ids when configured', async () => {
    const requestMock = vi.fn(async () => ({
      statusCode: 200,
      body: {
        text: async () =>
          JSON.stringify({
            servers: [
              { id: 5, name: 'Plex', server_type: 'plex', external_url: 'https://plex.rasies.com' },
              {
                id: 8,
                name: 'Audio Books',
                server_type: 'audiobookshelf',
                external_url: 'https://audio.rasies.com'
              },
              {
                id: 13,
                name: 'Books',
                server_type: 'kavita',
                external_url: 'https://books.rasies.com'
              }
            ]
          })
      }
    }));

    const ids = await resolveSignupServerIds(
      buildEnv({ WIZARR_PLEX_SERVER_IDS: '5, 8, 8, 999' }),
      [],
      requestMock as unknown as RequestFn
    );

    expect(ids).toEqual([5, 8]);
    expect(requestMock).toHaveBeenCalledOnce();
  });

  it('discovers all signup server ids from Wizarr when no explicit ids are set', async () => {
    const requestMock = vi.fn(async () => ({
      statusCode: 200,
      body: {
        text: async () =>
          JSON.stringify({
            servers: [
              {
                id: 1,
                name: 'Plex',
                server_type: 'plex',
                external_url: 'https://plex.rasies.com'
              },
              {
                id: 2,
                name: 'Audio Books',
                server_type: 'audiobookshelf',
                external_url: 'https://audio.rasies.com'
              },
              {
                id: 3,
                name: 'Books',
                server_type: 'kavita',
                external_url: 'https://books.rasies.com'
              }
            ]
          })
      }
    }));

    const ids = await resolveSignupServerIds(buildEnv(), [], requestMock as unknown as RequestFn);
    expect(ids).toEqual([1, 2, 3]);
  });

  it('loads signup services and prefers secure urls when Wizarr reports both', async () => {
    const requestMock = vi.fn(async () => ({
      statusCode: 200,
      body: {
        text: async () =>
          JSON.stringify({
            servers: [
              {
                id: 7,
                name: 'Books',
                server_type: 'kavita',
                external_url: 'https://books.rasies.com',
                verified: true
              },
              {
                id: 4,
                name: 'Navidrome',
                server_type: 'navidrome',
                external_url: 'https://music.rasies.com',
                verified: true,
                allow_downloads: true
              },
              {
                id: 2,
                name: 'Audio Books',
                server_type: 'audiobookshelf',
                external_url: 'http://audio.rasies.com',
                server_url: 'https://audio.rasies.com'
              },
              {
                id: 1,
                name: 'Plex',
                server_type: 'plex',
                server_url: 'http://plex.rasies.com',
                allow_downloads: true,
                allow_live_tv: false,
                allow_mobile_uploads: true
              },
              {
                id: 5,
                name: 'Broken service',
                server_type: 'custom',
                external_url: 'not-a-url'
              }
            ]
          })
      }
    }));

    const services = await fetchSignupServices(buildEnv(), requestMock as unknown as RequestFn);

    expect(services).toEqual([
      {
        id: 1,
        name: 'Plex',
        type: 'plex',
        url: 'http://plex.rasies.com',
        verified: false,
        allowDownloads: true,
        allowLiveTv: false,
        allowMobileUploads: true
      },
      {
        id: 4,
        name: 'Navidrome',
        type: 'navidrome',
        url: 'https://music.rasies.com',
        verified: true,
        allowDownloads: true,
        allowLiveTv: false,
        allowMobileUploads: false
      },
      {
        id: 2,
        name: 'Audio Books',
        type: 'audiobookshelf',
        url: 'https://audio.rasies.com',
        verified: false,
        allowDownloads: false,
        allowLiveTv: false,
        allowMobileUploads: false
      },
      {
        id: 7,
        name: 'Books',
        type: 'kavita',
        url: 'https://books.rasies.com',
        verified: true,
        allowDownloads: false,
        allowLiveTv: false,
        allowMobileUploads: false
      }
    ]);
  });

  it('fails clearly when signup.rasies.com is redirecting into Authentik', async () => {
    const requestMock = vi.fn(async () => ({
      statusCode: 302,
      headers: {
        location: 'https://auth.rasies.com/if/flow/runtipi-waitlist-enrollment/'
      },
      body: {
        text: async () => ''
      }
    }));

    await expect(
      fetchSignupServices(buildEnv(), requestMock as unknown as RequestFn)
    ).rejects.toThrow(/landing on Authentik instead of Wizarr/i);
  });

  it('finds an invite by code and uses the attached server names as the label', async () => {
    const requestMock = vi.fn(async () => ({
      statusCode: 200,
      body: {
        text: async () =>
          JSON.stringify({
            invitations: [
              {
                code: 'ABC123',
                url: 'http://signup.rasies.com/j/ABC123',
                expires: '2026-05-11T14:41:11.874824',
                display_name: "Rassy's Plex Signup",
                status: 'used',
                used_by: 'Family Member',
                used_at: '2026-04-10T10:15:00.000Z',
                server_names: ['Plex', 'Books']
              }
            ]
          })
      }
    }));

    const invite = await findInvitationByCode(
      buildEnv(),
      'abc123',
      requestMock as unknown as RequestFn
    );

    expect(invite).toEqual({
      inviteUrl: 'https://signup.rasies.com/j/ABC123',
      expiresAt: '2026-05-11T14:41:11.874824',
      code: 'ABC123',
      label: 'Plex, Books',
      status: 'used',
      usedBy: 'Family Member',
      usedAt: '2026-04-10T10:15:00.000Z',
      serverNames: ['Plex', 'Books']
    });
  });

  it('creates a family invite and refetches the richer invite details from Wizarr', async () => {
    const requestMock = vi.fn(async (url: string, options?: Parameters<RequestFn>[1]) => {
      if (url.endsWith('/api/servers')) {
        return {
          statusCode: 200,
          body: {
            text: async () =>
              JSON.stringify({
                servers: [
                  {
                    id: 1,
                    name: 'Plex',
                    server_type: 'plex',
                    external_url: 'https://plex.rasies.com'
                  },
                  {
                    id: 2,
                    name: 'Audio Books',
                    server_type: 'audiobookshelf',
                    external_url: 'https://audio.rasies.com'
                  },
                  {
                    id: 3,
                    name: 'Books',
                    server_type: 'kavita',
                    external_url: 'https://books.rasies.com'
                  }
                ]
              })
          }
        };
      }

      if (options?.method === 'POST') {
        expect(url.endsWith('/api/invitations')).toBe(true);
        expect(JSON.parse(String(options.body ?? ''))).toMatchObject({
          server_ids: [1, 2, 3],
          expires_in_days: 30,
          duration: 'unlimited',
          unlimited: true
        });

        return {
          statusCode: 201,
          body: {
            text: async () =>
              JSON.stringify({
                invitation: {
                  code: 'ABC123',
                  url: 'http://signup.rasies.com/j/ABC123',
                  expires: '2026-05-11T14:41:11.874824',
                  display_name: 'Plex',
                  status: 'pending',
                  server_names: ['Plex']
                }
              })
          }
        };
      }

      return {
        statusCode: 200,
        body: {
          text: async () =>
            JSON.stringify({
              invitations: [
                {
                  code: 'ABC123',
                  url: 'http://signup.rasies.com/j/ABC123',
                  expires: '2026-05-11T14:41:11.874824',
                  display_name: "Rassy's Plex Signup",
                  status: 'pending',
                  server_names: ['Plex', 'Audio Books', 'Books']
                }
              ]
            })
        }
      };
    });

    const invite = await createSignupInvite(
      buildEnv(),
      [1, 2, 3],
      requestMock as unknown as RequestFn
    );

    expect(invite).toEqual({
      inviteUrl: 'https://signup.rasies.com/j/ABC123',
      expiresAt: '2026-05-11T14:41:11.874824',
      code: 'ABC123',
      label: 'Plex, Audio Books, Books',
      status: 'pending',
      usedBy: null,
      usedAt: null,
      serverNames: ['Plex', 'Audio Books', 'Books']
    });
  });
});
