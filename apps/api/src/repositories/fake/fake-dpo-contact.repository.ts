import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DpoContact } from '@prisma/client';
import { IDpoContactRepository } from '../interfaces/dpo-contact.repository.interface';
import { UpsertDpoContactData } from '../types';

@Injectable()
export class FakeDpoContactRepository implements IDpoContactRepository {
  private byOrg = new Map<string, DpoContact>();

  async upsert(data: UpsertDpoContactData): Promise<DpoContact> {
    const existing = this.byOrg.get(data.organizationId);
    const now = new Date();
    const row: DpoContact = {
      id: existing?.id ?? randomUUID(),
      organizationId: data.organizationId,
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      authorityEmail: data.authorityEmail,
      retentionPolicyDays: data.retentionPolicyDays ?? 2555,
      updatedBy: data.updatedBy ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.byOrg.set(data.organizationId, row);
    return { ...row };
  }

  async findByOrg(organizationId: string): Promise<DpoContact | null> {
    const row = this.byOrg.get(organizationId);
    return row ? { ...row } : null;
  }
}
