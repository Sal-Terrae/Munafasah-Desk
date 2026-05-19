import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ComplianceMatrix } from '@prisma/client';
import { IComplianceMatrixRepository } from '../interfaces/compliance-matrix.repository.interface';
import {
  CreateComplianceMatrixData,
  UpdateComplianceMatrixData,
} from '../types';

@Injectable()
export class FakeComplianceMatrixRepository
  implements IComplianceMatrixRepository
{
  private records = new Map<string, ComplianceMatrix>();

  async findAllForTender(
    tenderId: string,
    organizationId: string,
  ): Promise<ComplianceMatrix[]> {
    return Array.from(this.records.values())
      .filter(
        (m) =>
          m.tenderId === tenderId && m.organizationId === organizationId,
      )
      .sort((a, b) => b.version - a.version);
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<ComplianceMatrix | null> {
    const m = this.records.get(id);
    return m && m.organizationId === organizationId ? { ...m } : null;
  }

  async findByVersion(
    tenderId: string,
    version: number,
    organizationId: string,
  ): Promise<ComplianceMatrix | null> {
    for (const m of this.records.values()) {
      if (
        m.tenderId === tenderId &&
        m.version === version &&
        m.organizationId === organizationId
      ) {
        return { ...m };
      }
    }
    return null;
  }

  async latestForTender(
    tenderId: string,
    organizationId: string,
  ): Promise<ComplianceMatrix | null> {
    const versions = await this.findAllForTender(tenderId, organizationId);
    return versions.length > 0 ? versions[0] : null;
  }

  async create(data: CreateComplianceMatrixData): Promise<ComplianceMatrix> {
    // Enforce the @@unique([tenderId, version]) constraint behaviour
    const clash = await this.findByVersion(
      data.tenderId,
      data.version,
      data.organizationId,
    );
    if (clash) {
      throw new Error(
        `ComplianceMatrix version ${data.version} already exists for tender ${data.tenderId}`,
      );
    }
    const now = new Date();
    const m: ComplianceMatrix = {
      id: randomUUID(),
      tenderId: data.tenderId,
      organizationId: data.organizationId,
      version: data.version,
      status: data.status ?? 'draft',
      generatedAt: data.generatedAt ?? now,
      createdAt: now,
      updatedAt: now,
    };
    this.records.set(m.id, m);
    return { ...m };
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateComplianceMatrixData,
  ): Promise<ComplianceMatrix> {
    const m = this.records.get(id);
    if (!m || m.organizationId !== organizationId) {
      throw new Error('ComplianceMatrix not found or not in organization');
    }
    if (data.status !== undefined) m.status = data.status;
    m.updatedAt = new Date();
    return { ...m };
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    const m = this.records.get(id);
    if (!m || m.organizationId !== organizationId) return false;
    return this.records.delete(id);
  }
}
