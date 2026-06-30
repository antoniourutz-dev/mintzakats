import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RECOVERY_ATTEMPT_KEY,
  clearRecoveryFlag,
  recoverMintzakatsClient,
} from './recoverClient';

describe('recoverMintzakatsClient', () => {
  const storage = new Map<string, string>();
  const unregister = vi.fn().mockResolvedValue(true);
  const deleteCache = vi.fn().mockResolvedValue(true);
  const replace = vi.fn();

  beforeEach(() => {
    storage.clear();
    replace.mockReset();
    unregister.mockClear();
    deleteCache.mockClear();

    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    });
    vi.stubGlobal('navigator', {
      serviceWorker: {
        getRegistrations: vi.fn().mockResolvedValue([{ unregister }]),
      },
    });
    vi.stubGlobal('caches', {
      keys: vi.fn().mockResolvedValue(['workbox-precache-v2', 'other-cache']),
      delete: deleteCache,
    });
    vi.stubGlobal('window', {
      caches: {
        keys: vi.fn().mockResolvedValue(['workbox-precache-v2', 'other-cache']),
        delete: deleteCache,
      },
      location: {
        href: 'https://mintzakats.app/',
        replace,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('desregistra workers, borra caches mintzakats y recarga', async () => {
    await recoverMintzakatsClient();

    expect(storage.get(RECOVERY_ATTEMPT_KEY)).toBe('1');
    expect(unregister).toHaveBeenCalledTimes(1);
    expect(deleteCache).toHaveBeenCalledWith('workbox-precache-v2');
    expect(deleteCache).not.toHaveBeenCalledWith('other-cache');
    expect(replace).toHaveBeenCalledWith(expect.stringContaining('recovered='));
  });

  it('no reintenta si ya se intento en esta pestaña', async () => {
    storage.set(RECOVERY_ATTEMPT_KEY, '1');

    await expect(recoverMintzakatsClient()).rejects.toThrow(
      'Berreskuratze automatikoak ez du arazoa konpondu.',
    );
    expect(unregister).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('clearRecoveryFlag elimina la marca de intento', () => {
    storage.set(RECOVERY_ATTEMPT_KEY, '1');
    clearRecoveryFlag();
    expect(storage.has(RECOVERY_ATTEMPT_KEY)).toBe(false);
  });
});
