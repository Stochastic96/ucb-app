// Runs fn over items with at most `limit` items in-flight simultaneously.
// Drop-in replacement for Promise.all(items.map(fn)) with a concurrency cap.
export async function concurrentMap(items, fn, limit = 3) {
  if (!items.length) return [];
  const results = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return results;
}

// Like concurrentMap but wraps each result as { status, value } or { status, reason }
// — drop-in replacement for Promise.allSettled(items.map(fn)) with a concurrency cap.
export async function concurrentSettled(items, fn, limit = 3) {
  if (!items.length) return [];
  const results = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: 'fulfilled', value: await fn(items[i]) };
      } catch (e) {
        results[i] = { status: 'rejected', reason: e };
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return results;
}
