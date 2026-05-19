import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ComplianceItem } from '@prisma/client';
import { IComplianceItemRepository } from '../interfaces/compliance-item.repository.interface';
import {
  CreateComplianceItemData,
  UpdateComplianceItemData,
} from '../types';

@Injectable()
export class FakeComplianceItemRepository
  implements IComplianceItemRepository
{
  private records = new Map<string, ComplianceItem>();

  async findAllForMatrix(
    matrixId: string,
    organizationId: string,
  ): Promise<ComplianceItem[]> {
    return Array.from(this.records.values()).filter(
      (i) =>
        i.matrixId === matrixId && i.organizationId === organizationId,
    );
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<ComplianceItem | null> {
    const i = this.records.get(id);
    return i && i.organizationId === organizationId ? { ...i } : null;
  }

  async create(data: CreateComplianceItemData): Promise<ComplianceItem> {
    const now = new Date();
    const i: ComplianceItem = {
      id: randomUUID(),
      matrixId: data.matrixId,
      organizationId: data.organizationId,
      requirementId: data.requirementId,
      requirementText: data.requirementText,
      category: data.category,
      owner: data.owner,
      risk: data.risk,
      status: data.status,
      dueDate: data.dueDate ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.records.set(i.id, i);
    return { ...i };
  }

  async createMany(
    data: CreateComplianceItemData[],
  ): Promise<ComplianceItem[]> {
    const created: ComplianceItem[] = [];
    for (const d of data) {
      created.push(await this.create(d));
    }
    return created;
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateComplianceItemData,
  ): Promise<ComplianceItem> {
    const i = this.records.get(id);
    if (!i || i.organizationId !== organizationId) {
      throw new Error('ComplianceItem not found or not in organization');
    }
    if (data.owner !== undefined) i.owner = data.owner;
    if (data.status !== undefined) i.status = data.status;
    if (data.risk !== undefined) i.risk = data.risk;
    if (data.dueDate !== undefined) i.dueDate = data.dueDate;
    i.updatedAt = new Date();
    return { ...i };
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    const i = this.records.get(id);
    if (!i || i.organizationId !== organizationId) return false;
    return this.records.delete(id);
  }
}
