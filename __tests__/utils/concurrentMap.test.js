import { concurrentMap, concurrentSettled } from '../../utils/concurrentMap';

describe('concurrentMap', () => {
  it('returns [] for empty/nullish input', async () => {
    expect(await concurrentMap([], async (x) => x)).toEqual([]);
    expect(await concurrentMap(null, async (x) => x)).toEqual([]);
    expect(await concurrentMap(undefined, async (x) => x)).toEqual([]);
  });

  it('maps every item and preserves input order despite async timing', async () => {
    const items = [30, 10, 20, 5];
    const result = await concurrentMap(
      items,
      (ms) => new Promise((res) => setTimeout(() => res(ms * 2), ms)),
      2
    );
    expect(result).toEqual([60, 20, 40, 10]);
  });

  it('never exceeds the concurrency limit', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const items = Array.from({ length: 10 }, (_, i) => i);

    await concurrentMap(
      items,
      async () => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((r) => setTimeout(r, 5));
        inFlight--;
      },
      3
    );

    expect(maxInFlight).toBeLessThanOrEqual(3);
  });

  it('processes all items even when limit exceeds item count', async () => {
    const result = await concurrentMap([1, 2], async (x) => x + 1, 10);
    expect(result).toEqual([2, 3]);
  });
});

describe('concurrentSettled', () => {
  it('returns [] for empty input', async () => {
    expect(await concurrentSettled([], async (x) => x)).toEqual([]);
  });

  it('wraps successes and failures like Promise.allSettled', async () => {
    const items = [1, 2, 3];
    const result = await concurrentSettled(
      items,
      async (x) => {
        if (x === 2) throw new Error('boom');
        return x * 10;
      },
      2
    );

    expect(result[0]).toEqual({ status: 'fulfilled', value: 10 });
    expect(result[1].status).toBe('rejected');
    expect(result[1].reason).toBeInstanceOf(Error);
    expect(result[1].reason.message).toBe('boom');
    expect(result[2]).toEqual({ status: 'fulfilled', value: 30 });
  });

  it('a single rejection does not abort the others', async () => {
    const result = await concurrentSettled(
      [1, 2, 3, 4],
      async (x) => {
        if (x % 2 === 0) throw new Error(`fail-${x}`);
        return x;
      },
      2
    );
    const fulfilled = result.filter((r) => r.status === 'fulfilled');
    const rejected = result.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(2);
    expect(rejected).toHaveLength(2);
  });
});
