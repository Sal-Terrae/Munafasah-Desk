import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { TenderRequirement } from '@prisma/client';
import { ITenderRequirementRepository } from '../interfaces/tender-requirement.repository.interface';
import {
  CreateTenderRequirementData,
  UpdateTenderRequirementData,
} from '../types';

@Injectable()
export class FakeTenderRequirementRepository
  implements ITenderRequirementRepository
{
  private records = new Map<string, TenderRequirement>();

  async findAllForTender(
    tenderId: string,
    organizationId: string,
  ): Promise<TenderRequirement[]> {
    return Array.from(this.records.values()).filter(
      (r) =>
        r.tenderId === tenderId && r.organizationId === organizationId,
    );
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<TenderRequirement | null> {
    const r = this.records.get(id);
    return r && r.organizationId === organizationId ? { ...r } : null;
  }

  async create(
    data: CreateTenderRequirementData,
  ): Promise<TenderRequirement> {
    const now = new Date();
    const r: TenderRequirement = {
      id: randomUUID(),
      tenderId: data.tenderId,
      organizationId: data.organizationId,
      category: data.category,
      text: data.text,
      risk: data.risk ?? 'medium',
      owner: data.owner ?? null,
      source: data.source ?? 'manual',
      createdAt: now,
      updatedAt: now,
    };
    this.records.set(r.id, r);
    return { ...r };
  }

  async createMany(
    data: CreateTenderRequirementData[],
  ): Promise<TenderRequirement[]> {
    const created: TenderRequirement[] = [];
    for (const d of data) {
      created.push(await this.create(d));
    }
    return created;
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateTenderRequirementData,
  ): Promise<TenderRequirement> {
    const r = this.records.get(id);
    if (!r || r.organizationId !== organizationId) {
      throw new Error('TenderRequirement not found or not in organization');
    }
    if (data.category !== undefined) r.category = data.category;
    if (data.text !== undefined) r.text = data.text;
    if (data.risk !== undefined) r.risk = data.risk;
    if (data.owner !== undefined) r.owner = data.owner;
    r.updatedAt = new Date();
    return { ...r };
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    const r = this.records.get(id);
    if (!r || r.organizationId !== organizationId) return false;
    return this.records.delete(id);
  }
}
