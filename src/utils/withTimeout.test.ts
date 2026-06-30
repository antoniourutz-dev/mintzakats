import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withTimeout } from './withTimeout';

describe('withTimeout', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      setTimeout: globalThis.setTimeout.bind(globalThis),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('resuelve si la promesa termina a tiempo', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 100)).resolves.toBe('ok');
  });

  it('rechaza si la promesa tarda demasiado', async () => {
    vi.useFakeTimers();
    const pending = withTimeout(new Promise<string>(() => {}), 50);

    await vi.advanceTimersByTimeAsync(50);

    await expect(pending).rejects.toThrow('Timeout after 50ms');
  });
});
