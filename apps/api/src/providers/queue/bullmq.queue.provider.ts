import { Logger } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import IORedis, { Redis } from 'ioredis';
import type {
  EnqueueOptions,
  IQueueProvider,
  JobHandler,
} from './queue.provider.interface';

export interface BullMQConfig {
  redisUrl: string;
  /** Prefix all queues — useful when sharing a Redis with other apps. */
  prefix?: string;
}

/**
 * BullMQ-backed queue provider. Created lazily so the in-memory
 * default doesn't pay the Redis connection cost. One `Queue` per
 * queue-name + one `Worker` per `process()` registration.
 */
export class BullMQQueueProvider implements IQueueProvider {
  readonly name = 'bullmq';
  private readonly log = new Logger(BullMQQueueProvider.name);
  private readonly connection: Redis;
  private readonly queues = new Map<string, Queue>();
  private readonly workers: Worker[] = [];

  constructor(private readonly cfg: BullMQConfig) {
    this.connection = new IORedis(cfg.redisUrl, {
      maxRetriesPerRequest: null,
    });
  }

  async enqueue<TPayload>(
    queue: string,
    jobName: string,
    payload: TPayload,
    opts: EnqueueOptions = {},
  ): Promise<string> {
    const q = this.queue(queue);
    const job = await q.add(jobName, payload as object, {
      delay: opts.delayMs,
      attempts: opts.maxAttempts ?? 1,
      backoff:
        opts.backoffMs !== undefined
          ? { type: 'fixed', delay: opts.backoffMs }
          : undefined,
      jobId: opts.dedupeKey,
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 24 * 3600, count: 5000 },
    });
    return String(job.id);
  }

  async process<TPayload>(
    queue: string,
    handler: JobHandler<TPayload>,
    concurrency = 1,
  ): Promise<void> {
    const worker = new Worker(
      queue,
      async (job) => {
        await handler({
          id: String(job.id),
          name: job.name,
          payload: job.data as TPayload,
          attemptsMade: job.attemptsMade,
          enqueuedAt: new Date(job.timestamp),
        });
      },
      {
        connection: this.connection,
        concurrency,
        prefix: this.cfg.prefix,
      },
    );
    worker.on('failed', (job, err) => {
      this.log.error(
        `worker=${queue} job=${job?.id} failed: ${err.message}`,
      );
    });
    this.workers.push(worker);
  }

  async close(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.close()));
    await Promise.all([...this.queues.values()].map((q) => q.close()));
    await this.connection.quit();
  }

  private queue(name: string): Queue {
    const existing = this.queues.get(name);
    if (existing) return existing;
    const q = new Queue(name, {
      connection: this.connection,
      prefix: this.cfg.prefix,
    });
    this.queues.set(name, q);
    return q;
  }
}
