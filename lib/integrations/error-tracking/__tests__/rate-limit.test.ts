import { describe, it, expect } from 'vitest';
import { createRateLimiter } from '../rate-limit';

describe('createRateLimiter', () => {
  it('serializes calls in order and enforces the min interval', async () => {
    const waits: number[] = [];
    let clock = 1000;
    const rl = createRateLimiter({
      minIntervalMs: 100,
      now: () => clock,
      sleep: async (ms) => {
        waits.push(ms);
        clock += ms;
      },
    });

    const order: number[] = [];
    await Promise.all([
      rl.run(async () => {
        order.push(1);
      }),
      rl.run(async () => {
        order.push(2);
      }),
      rl.run(async () => {
        order.push(3);
      }),
    ]);

    expect(order).toEqual([1, 2, 3]); // serialized
    expect(waits).toEqual([100, 100]); // first immediate, next two throttled
  });

  it('keeps running later tasks even when one rejects', async () => {
    const rl = createRateLimiter({ minIntervalMs: 0, now: () => 0, sleep: async () => {} });
    const ran: string[] = [];
    const p1 = rl.run(async () => {
      ran.push('a');
      throw new Error('boom');
    });
    const p2 = rl.run(async () => {
      ran.push('b');
    });
    await expect(p1).rejects.toThrow('boom');
    await p2;
    expect(ran).toEqual(['a', 'b']);
  });

  it('returns the wrapped function result', async () => {
    const rl = createRateLimiter({ minIntervalMs: 0, now: () => 0, sleep: async () => {} });
    expect(await rl.run(async () => 42)).toBe(42);
  });
});
