import { InboundEmail } from '@prisma/client';

export interface CreateInboundEmailData {
  messageId: string;
  organizationId?: string | null;
  fromAddress: string;
  toAddress: string;
  subject?: string | null;
  body: string;
  status: 'routed' | 'unrouted' | 'rejected';
  routedAction?: string | null;
  routedEntityType?: string | null;
  routedEntityId?: string | null;
  rejectionReason?: string | null;
  receivedAt?: Date;
}

export interface IInboundEmailRepository {
  findByMessageId(messageId: string): Promise<InboundEmail | null>;
  create(data: CreateInboundEmailData): Promise<InboundEmail>;
  findRecent(organizationId: string, limit?: number): Promise<InboundEmail[]>;
}
