import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { IDpoContactRepository } from '../interfaces/dpo-contact.repository.interface';
import { UpsertDpoContactData } from '../types';

@Injectable()
export class DpoContactPrismaRepository implements IDpoContactRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(data: UpsertDpoContactData) {
    return this.prisma.dpoContact.upsert({
      where: { organizationId: data.organizationId },
      create: {
        organization: { connect: { id: data.organizationId } },
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        authorityEmail: data.authorityEmail,
        retentionPolicyDays: data.retentionPolicyDays ?? 2555,
        updatedBy: data.updatedBy ?? null,
      },
      update: {
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        authorityEmail: data.authorityEmail,
        retentionPolicyDays: data.retentionPolicyDays ?? 2555,
        updatedBy: data.updatedBy ?? null,
      },
    });
  }

  async findByOrg(organizationId: string) {
    return this.prisma.dpoContact.findUnique({
      where: { organizationId },
    });
  }
}
