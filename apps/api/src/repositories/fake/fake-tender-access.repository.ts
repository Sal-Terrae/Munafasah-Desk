import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { TenderAccess } from '@prisma/client';
import { ITenderAccessRepository } from '../interfaces/tender-access.repository.interface';
import {
  CreateTenderAccessData,
  UpdateTenderAccessData,
} from '../types';

@Injectable()
export class FakeTenderAccessRepository implements ITenderAccessRepository {
  private records = new Map<string, TenderAccess>();

  async create(data: CreateTenderAccessData): Promise<TenderAccess> {
    const existing = await this.findByUserAndTender(
      data.userId,
      data.tenderId,
      data.organizationId,
    );
    if (existing) {
      throw new Error(
        `TenderAccess already exists for user ${data.userId} on tender ${data.tenderId}`,
      );
    }
    const now = new Date();
    const ta: TenderAccess = {
      id: randomUUID(),
      organizationId: data.organizationId,
      userId: data.userId,
      tenderId: data.tenderId,
      role: data.role,
      grantedBy: data.grantedBy ?? null,
      grantedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    this.records.set(ta.id, ta);
    return { ...ta };
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<TenderAccess | null> {
    const ta = this.records.get(id);
    return ta && ta.organizationId === organizationId ? { ...ta } : null;
  }

  async findAllForTender(
    tenderId: string,
    organizationId: string,
  ): Promise<TenderAccess[]> {
    return Array.from(this.records.values())
      .filter(
        (ta) =>
          ta.tenderId === tenderId && ta.organizationId === organizationId,
      )
      .map((ta) => ({ ...ta }));
  }

  async findAllForUser(
    userId: string,
    organizationId: string,
  ): Promise<TenderAccess[]> {
    return Array.from(this.records.values())
      .filter(
        (ta) =>
          ta.userId === userId && ta.organizationId === organizationId,
      )
      .map((ta) => ({ ...ta }));
  }

  async findByUserAndTender(
    userId: string,
    tenderId: string,
    organizationId: string,
  ): Promise<TenderAccess | null> {
    for (const ta of this.records.values()) {
      if (
        ta.userId === userId &&
        ta.tenderId === tenderId &&
        ta.organizationId === organizationId
      ) {
        return { ...ta };
      }
    }
    return null;
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateTenderAccessData,
  ): Promise<TenderAccess> {
    const ta = this.records.get(id);
    if (!ta || ta.organizationId !== organizationId) {
      throw new Error('TenderAccess not found or not in organization');
    }
    if (data.role !== undefined) ta.role = data.role;
    ta.updatedAt = new Date();
    return { ...ta };
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    const ta = this.records.get(id);
    if (!ta || ta.organizationId !== organizationId) return false;
    return this.records.delete(id);
  }

  async revoke(
    userId: string,
    tenderId: string,
    organizationId: string,
  ): Promise<boolean> {
    const ta = await this.findByUserAndTender(
      userId,
      tenderId,
      organizationId,
    );
    if (!ta) return false;
    return this.records.delete(ta.id);
  }
}
