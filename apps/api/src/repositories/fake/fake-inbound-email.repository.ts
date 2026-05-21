import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InboundEmail } from '@prisma/client';
import {
  CreateInboundEmailData,
  IInboundEmailRepository,
} from '../interfaces/inbound-email.repository.interface';

@Injectable()
export class FakeInboundEmailRepository implements IInboundEmailRepository {
  readonly rows = new Map<string, InboundEmail>();
  private byMessageId = new Map<string, InboundEmail>();

  async findByMessageId(messageId: string): Promise<InboundEmail | null> {
    return this.byMessageId.get(messageId) ?? null;
  }

  async create(data: CreateInboundEmailData): Promise<InboundEmail> {
    if (this.byMessageId.has(data.messageId)) {
      throw new Error(
        `unique constraint: messageId=${data.messageId} already exists`,
      );
    }
    const row: InboundEmail = {
      id: randomUUID(),
      messageId: data.messageId,
      organizationId: data.organizationId ?? null,
      fromAddress: data.fromAddress,
      toAddress: data.toAddress,
      subject: data.subject ?? null,
      body: data.body,
      status: data.status,
      routedAction: data.routedAction ?? null,
      routedEntityType: data.routedEntityType ?? null,
      routedEntityId: data.routedEntityId ?? null,
      rejectionReason: data.rejectionReason ?? null,
      receivedAt: data.receivedAt ?? new Date(),
      createdAt: new Date(),
    };
    this.rows.set(row.id, row);
    this.byMessageId.set(row.messageId, row);
    return { ...row };
  }

  async findRecent(
    organizationId: string,
    limit = 100,
  ): Promise<InboundEmail[]> {
    return [...this.rows.values()]
      .filter((r) => r.organizationId === organizationId)
      .sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime())
      .slice(0, limit)
      .map((r) => ({ ...r }));
  }
}
