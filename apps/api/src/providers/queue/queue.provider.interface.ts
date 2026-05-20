export interface QueueJob<TPayload = unknown> {
  id: string;
  name: string;
  payload: TPayload;
  attemptsMade: number;
  enqueuedAt: Date;
}

export interface EnqueueOptions {
  /** Defer execution by N milliseconds. */
  delayMs?: number;
  /** Max attempts before the job is marked failed. */
  maxAttempts?: number;
  /** Backoff between retries (ms). */
  backoffMs?: number;
  /** Deduplication key — second enqueue with the same key is a no-op. */
  dedupeKey?: string;
}

export type JobHandler<TPayload = unknown> = (
  job: QueueJob<TPayload>,
) => Promise<void>;

export interface IQueueProvider {
  readonly name: string;
  /** Enqueue a job onto the named queue. Returns the job id. */
  enqueue<TPayload>(
    queue: string,
    jobName: string,
    payload: TPayload,
    opts?: EnqueueOptions,
  ): Promise<string>;
  /** Register a worker for the named queue. */
  process<TPayload>(
    queue: string,
    handler: JobHandler<TPayload>,
    concurrency?: number,
  ): Promise<void>;
  /** Cleanly close all queue + worker resources. */
  close(): Promise<void>;
}
