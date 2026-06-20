export interface RateLimiter {
  /** Run `fn` after the previous call and after the minimum interval has elapsed. */
  run<T>(fn: () => Promise<T>): Promise<T>;
}

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Serializes async calls and enforces a minimum gap between them. There is ONE
 * Notion workspace, so every source's writes share this limiter to stay under
 * Notion's ~3 req/s. The clock is injectable for deterministic tests.
 */
export function createRateLimiter(opts: {
  minIntervalMs: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}): RateLimiter {
  const now = opts.now ?? Date.now;
  const sleep = opts.sleep ?? realSleep;
  let tail: Promise<unknown> = Promise.resolve();
  let last = 0;

  return {
    run<T>(fn: () => Promise<T>): Promise<T> {
      const result = tail.then(async () => {
        const wait = last + opts.minIntervalMs - now();
        if (wait > 0) await sleep(wait);
        last = now();
        return fn();
      });
      // Keep the chain alive even if a task rejects, so later tasks still run.
      tail = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
  };
}
