import { Platform } from 'react-native';

import { warnImageUnreachable } from '@/features/branding/services/warnImageUnreachable';

const originalOS = Platform.OS;

function setOS(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
}

describe('warnImageUnreachable', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.warn as jest.Mock).mockRestore();
    setOS(originalOS);
  });

  it('warns about a dev-machine self-reference for a loopback host on a native platform', () => {
    setOS('ios');

    warnImageUnreachable('Logo', 'https://localhost:4000/logo.png', 'Network request failed');

    expect(console.warn).toHaveBeenCalledWith(
      '[branding] Logo failed to load: its URL points at "localhost", which on ios means this device, ' +
        'not your dev machine. Restart skateboard-app-config-be with AWS_ENDPOINT_URL set to a LAN address ' +
        '(or 10.0.2.2 on an Android emulator). Underlying error: Network request failed',
    );
  });

  it.each(['127.0.0.1', '0.0.0.0'])('recognizes %s as a loopback host', (host) => {
    setOS('android');

    warnImageUnreachable('Background', `http://${host}/bg.png`, 'timeout');

    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining(`points at "${host}"`));
  });

  it('recognizes a bracketed IPv6 loopback host', () => {
    setOS('android');

    warnImageUnreachable('Logo', 'http://[::1]:8080/logo.png', 'timeout');

    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('points at "::1"'));
  });

  it('falls back to the plain warning on web even for a loopback host', () => {
    setOS('web');

    warnImageUnreachable('Logo', 'https://localhost/logo.png', 'CORS error');

    expect(console.warn).toHaveBeenCalledWith('[branding] Logo failed to load from localhost: CORS error');
  });

  it('falls back to the plain warning for a non-loopback host', () => {
    setOS('ios');

    warnImageUnreachable('Background', 'https://cdn.example.com/bg.png', '404');

    expect(console.warn).toHaveBeenCalledWith('[branding] Background failed to load from cdn.example.com: 404');
  });

  it('strips credentials and keeps the port out of the reported host', () => {
    setOS('ios');

    warnImageUnreachable('Logo', 'https://user:pass@cdn.example.com:8443/logo.png', 'expired');

    expect(console.warn).toHaveBeenCalledWith('[branding] Logo failed to load from cdn.example.com: expired');
  });

  it('falls back to the raw url when it has no parseable host', () => {
    setOS('ios');

    warnImageUnreachable('Logo', 'not-a-url', 'unset');

    expect(console.warn).toHaveBeenCalledWith('[branding] Logo failed to load from not-a-url: unset');
  });
});
