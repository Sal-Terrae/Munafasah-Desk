import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  EnqueueOptions,
  IQueueProvider,
  JobHandler,
  QueueJob,
} from './queue.provider.interface';

/**
 * Default driver for tests + dev without Redis. No persistence, no
 * cross-process delivery; jobs live only in the current process.
 * Honors delayMs, maxAttempts, backoffMs, dedupeKey. Failures schedule
 * retries via setTimeout, up to maxAttempts.
 */
export class InMemoryQueueProvider implements IQueueProvider {
  readonly name = 'memory';
  private readonly log = new Logger(InMemoryQueueProvider.name);
  private readonly handlers = new Map<string, JobHandler<unknown>>();
  private readonly seenDedupe = new Map<string, Set<string>>();
  private closed = false;

  async enqueue<TPayload>(
    queue: string,
    jobName: string,
    payload: TPayload,
    opts: EnqueueOptions = {},
  ): Promise<string> {
    if (this.closed) {
      throw new Error('queue provider closed');
    }
    if (opts.dedupeKey) {
      const set = this.seenDedupe.get(queue) ?? new Set<string>();
      if (set.has(opts.dedupeKey)) {
        return opts.dedupeKey;
      }
      set.add(opts.dedupeKey);
      this.seenDedupe.set(queue, set);
    }
    const job: QueueJob<TPayload> = {
      id: randomUUID(),
      name: jobName,
      payload,
      attemptsMade: 0,
      enqueuedAt: new Date(),
    };
    const run = () => this.run(queue, job, opts);
    if (opts.delayMs && opts.delayMs > 0) {
      setTimeout(run, opts.delayMs).unref?.();
    } else {
      setImmediate(run);
    }
    return job.id;
  }

  async process<TPayload>(
    queue: string,
    handler: JobHandler<TPayload>,
  ): Promise<void> {
    this.handlers.set(queue, handler as JobHandler<unknown>);
  }

  async close(): Promise<void> {
    this.closed = true;
    this.handlers.clear();
    this.seenDedupe.clear();
  }

  private async run<TPayload>(
    queue: string,
    job: QueueJob<TPayload>,
    opts: EnqueueOptions,
  ): Promise<void> {
    if (this.closed) return;
    const handler = this.handlers.get(queue);
    if (!handler) {
      this.log.warn(`no handler for queue=${queue}; dropping job=${job.id}`);
      return;
    }
    job.attemptsMade += 1;
    try {
      await handler(job as QueueJob<unknown>);
    } catch (err) {
      const max = opts.maxAttempts ?? 1;
      if (job.attemptsMade < max) {
        const backoff = opts.backoffMs ?? 1000;
        setTimeout(() => this.run(queue, job, opts), backoff).unref?.();
      } else {
        this.log.error(
          `job=${job.id} queue=${queue} failed after ${job.attemptsMade} attempts: ${(err as Error).message}`,
        );
      }
    }
  }
}
