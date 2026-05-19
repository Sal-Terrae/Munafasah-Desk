import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Organization } from '@prisma/client';
import { IOrganizationRepository } from '../interfaces/organization.repository.interface';
import {
  CreateOrganizationData,
  UpdateOrganizationData,
} from '../types';

@Injectable()
export class FakeOrganizationRepository
  implements IOrganizationRepository
{
  private records: Organization[] = [];

  async findAll(): Promise<Organization[]> {
    return this.records.map((r) => ({ ...r }));
  }

  async findById(id: string): Promise<Organization | null> {
    const r = this.records.find((r) => r.id === id);
    return r ? { ...r } : null;
  }

  async create(data: CreateOrganizationData): Promise<Organization> {
    const org: Organization = {
      id: randomUUID(),
      name: data.name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.records.push(org);
    return { ...org };
  }

  async update(
    id: string,
    data: UpdateOrganizationData,
  ): Promise<Organization> {
    const org = this.records.find((r) => r.id === id);
    if (!org) {
      throw new Error('Organization not found');
    }
    if (data.name !== undefined) {
      org.name = data.name;
    }
    // Monotonic: guarantees a strictly-later timestamp even when the
    // update happens within the same millisecond as create (deterministic).
    org.updatedAt = new Date(
      Math.max(Date.now(), org.updatedAt.getTime() + 1),
    );
    return { ...org };
  }

  async delete(id: string): Promise<boolean> {
    const idx = this.records.findIndex((r) => r.id === id);
    if (idx === -1) {
      throw new Error('Organization not found');
    }
    this.records.splice(idx, 1);
    return true;
  }
}
