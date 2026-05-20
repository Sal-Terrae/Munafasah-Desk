import { Logger } from '@nestjs/common';
import type { IQueueProvider } from './queue.provider.interface';
import { InMemoryQueueProvider } from './in-memory.queue.provider';
import { BullMQQueueProvider } from './bullmq.queue.provider';

const log = new Logger('createQueueProvider');

/**
 * QUEUE_PROVIDER=memory (default) — in-process, no Redis.
 * QUEUE_PROVIDER=bullmq — BullMQ over Redis (REDIS_URL or REDIS_HOST/REDIS_PORT).
 */
export function createQueueProvider(
  env: NodeJS.ProcessEnv = process.env,
): IQueueProvider {
  const provider = (env.QUEUE_PROVIDER ?? 'memory').toLowerCase();
  if (provider === 'memory') {
    return new InMemoryQueueProvider();
  }
  if (provider === 'bullmq') {
    const redisUrl =
      env.REDIS_URL ??
      `redis://${env.REDIS_HOST ?? 'localhost'}:${env.REDIS_PORT ?? '6379'}`;
    log.log(`bullmq queue → ${redisUrl}`);
    return new BullMQQueueProvider({
      redisUrl,
      prefix: env.BULLMQ_PREFIX ?? 'bidready',
    });
  }
  throw new Error(`Unsupported QUEUE_PROVIDER: ${provider}`);
}
