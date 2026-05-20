import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { IConsentEventRepository } from '../interfaces/consent-event.repository.interface';
import { CreateConsentEventData } from '../types';

@Injectable()
export class ConsentEventPrismaRepository implements IConsentEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateConsentEventData) {
    return this.prisma.consentEvent.create({
      data: {
        organization: { connect: { id: data.organizationId } },
        subjectEmail: data.subjectEmail,
        subjectUserId: data.subjectUserId ?? null,
        purpose: data.purpose,
        state: data.state,
        source: data.source ?? 'api',
        recordedBy: data.recordedBy ?? null,
        ...(data.details === undefined
          ? {}
          : { details: data.details as Prisma.InputJsonValue }),
      },
    });
  }

  async findAllForSubject(subjectEmail: string, organizationId: string) {
    return this.prisma.consentEvent.findMany({
      where: { subjectEmail, organizationId },
      orderBy: { recordedAt: 'desc' },
    });
  }

  async findById(id: string, organizationId: string) {
    return this.prisma.consentEvent.findFirst({
      where: { id, organizationId },
    });
  }

  async findCurrent(
    subjectEmail: string,
    purpose: string,
    organizationId: string,
  ) {
    return this.prisma.consentEvent.findFirst({
      where: { subjectEmail, purpose, organizationId },
      orderBy: { recordedAt: 'desc' },
    });
  }

  async anonymiseSubject(
    subjectEmail: string,
    organizationId: string,
    pseudonymousEmail: string,
  ): Promise<number> {
    const result = await this.prisma.consentEvent.updateMany({
      where: { subjectEmail, organizationId },
      data: { subjectEmail: pseudonymousEmail, subjectUserId: null },
    });
    return result.count;
  }
}
