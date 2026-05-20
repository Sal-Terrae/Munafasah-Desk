import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import { QUEUE_PROVIDER } from './queue.tokens';
import { createQueueProvider } from './create-queue-provider.factory';
import type { IQueueProvider } from './queue.provider.interface';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
class QueueShutdownHook implements OnApplicationShutdown {
  constructor(
    @Inject(QUEUE_PROVIDER) private readonly queue: IQueueProvider,
  ) {}
  async onApplicationShutdown(): Promise<void> {
    await this.queue.close();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: QUEUE_PROVIDER,
      useFactory: () => createQueueProvider(process.env),
    },
    QueueShutdownHook,
  ],
  exports: [QUEUE_PROVIDER],
})
export class QueueModule {}
