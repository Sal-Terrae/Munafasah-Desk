import { InMemoryQueueProvider } from './in-memory.queue.provider';

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

describe('InMemoryQueueProvider', () => {
  let q: InMemoryQueueProvider;

  beforeEach(() => {
    q = new InMemoryQueueProvider();
  });

  afterEach(async () => {
    await q.close();
  });

  it('enqueues and processes a job', async () => {
    const received: Array<{ name: string; n: number }> = [];
    await q.process<{ n: number }>('jobs', async (job) => {
      received.push({ name: job.name, n: job.payload.n });
    });
    await q.enqueue('jobs', 'addOne', { n: 1 });
    await q.enqueue('jobs', 'addOne', { n: 2 });
    await tick(20);
    expect(received).toEqual([
      { name: 'addOne', n: 1 },
      { name: 'addOne', n: 2 },
    ]);
  });

  it('honors delayMs', async () => {
    const t0 = Date.now();
    let ranAt = 0;
    await q.process('jobs', async () => {
      ranAt = Date.now();
    });
    await q.enqueue('jobs', 'late', {}, { delayMs: 30 });
    await tick(60);
    expect(ranAt - t0).toBeGreaterThanOrEqual(25);
  });

  it('dedupes by dedupeKey', async () => {
    let count = 0;
    await q.process('jobs', async () => {
      count++;
    });
    await q.enqueue('jobs', 'x', {}, { dedupeKey: 'k1' });
    await q.enqueue('jobs', 'x', {}, { dedupeKey: 'k1' });
    await q.enqueue('jobs', 'x', {}, { dedupeKey: 'k2' });
    await tick(20);
    expect(count).toBe(2);
  });

  it('retries failing jobs up to maxAttempts', async () => {
    let attempts = 0;
    await q.process('jobs', async () => {
      attempts++;
      throw new Error('boom');
    });
    await q.enqueue('jobs', 'x', {}, { maxAttempts: 3, backoffMs: 5 });
    await tick(80);
    expect(attempts).toBe(3);
  });

  it('rejects enqueue after close', async () => {
    await q.close();
    await expect(q.enqueue('jobs', 'x', {})).rejects.toThrow(/closed/);
  });
});
