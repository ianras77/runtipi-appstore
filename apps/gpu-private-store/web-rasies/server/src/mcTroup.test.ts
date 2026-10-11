import { describe, expect, it } from 'vitest';
import {
  buildTargetUrl,
  derivePublicBlueMapUrl,
  isPrivateHostname,
  normalizeProxyPath,
  resolveBlueMapBaseUrl,
  resolveBlueMapProxyBaseUrl
} from './mcTroup.js';

describe('normalizeProxyPath', () => {
  it('adds a leading slash and trims a trailing slash', () => {
    expect(normalizeProxyPath('mc-troup-map/')).toBe('/mc-troup-map');
  });
});

describe('buildTargetUrl', () => {
  const proxyPath = '/mc-troup-map';
  const upstreamBaseUrl = 'https://crafty.rasies.com/mc-troup-map';

  it('keeps the upstream base path for the root map route', () => {
    expect(buildTargetUrl('/mc-troup-map', proxyPath, upstreamBaseUrl)).toBe(
      'https://crafty.rasies.com/mc-troup-map/'
    );
  });

  it('appends nested BlueMap assets under the upstream base path', () => {
    expect(buildTargetUrl('/mc-troup-map/maps/world/live.js', proxyPath, upstreamBaseUrl)).toBe(
      'https://crafty.rasies.com/mc-troup-map/maps/world/live.js'
    );
  });

  it('preserves query strings when proxying the public map route', () => {
    expect(buildTargetUrl('/mc-troup-map/?zoom=5', proxyPath, upstreamBaseUrl)).toBe(
      'https://crafty.rasies.com/mc-troup-map/?zoom=5'
    );
  });
});

describe('isPrivateHostname', () => {
  it('marks LAN hosts and localhost as private', () => {
    expect(isPrivateHostname('192.168.100.10')).toBe(true);
    expect(isPrivateHostname('localhost')).toBe(true);
    expect(isPrivateHostname('mc-troup.local')).toBe(true);
  });

  it('keeps public hosts public', () => {
    expect(isPrivateHostname('crafty.rasies.com')).toBe(false);
    expect(isPrivateHostname('maps.example.net')).toBe(false);
  });
});

describe('derivePublicBlueMapUrl', () => {
  it('uses the minecraft server hostname and default map path', () => {
    expect(derivePublicBlueMapUrl('crafty.rasies.com:25565')).toBe('https://crafty.rasies.com/mc-troup-map');
  });

  it('preserves a custom map path when deriving the public URL', () => {
    expect(derivePublicBlueMapUrl('crafty.rasies.com:25565', '/maps/main')).toBe(
      'https://crafty.rasies.com/maps/main'
    );
  });
});

describe('resolveBlueMapBaseUrl', () => {
  const serverHost = 'crafty.rasies.com:25565';

  it('falls back to a public BlueMap URL when the configured host is private', () => {
    expect(resolveBlueMapBaseUrl('http://192.168.100.10:8100', serverHost)).toBe(
      'https://crafty.rasies.com/mc-troup-map'
    );
  });

  it('reuses the configured map path when a private URL already includes one', () => {
    expect(resolveBlueMapBaseUrl('http://192.168.100.10:8100/bluemap/', serverHost)).toBe(
      'https://crafty.rasies.com/bluemap'
    );
  });

  it('keeps public BlueMap URLs and normalizes away search params', () => {
    expect(resolveBlueMapBaseUrl('https://crafty.rasies.com/mc-troup-map/?world=main', serverHost)).toBe(
      'https://crafty.rasies.com/mc-troup-map'
    );
  });
});

describe('resolveBlueMapProxyBaseUrl', () => {
  const serverHost = 'crafty.rasies.com:25565';

  it('keeps a private upstream host for proxy traffic', () => {
    expect(resolveBlueMapProxyBaseUrl('http://192.168.100.10:8100', serverHost)).toBe(
      'http://192.168.100.10:8100/mc-troup-map'
    );
  });

  it('preserves a custom upstream map path for proxy traffic', () => {
    expect(resolveBlueMapProxyBaseUrl('http://192.168.100.10:8100/bluemap/', serverHost)).toBe(
      'http://192.168.100.10:8100/bluemap'
    );
  });
});
