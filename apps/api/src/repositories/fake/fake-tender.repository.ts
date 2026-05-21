import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma, Tender } from '@prisma/client';
import { ITenderRepository } from '../interfaces/tender.repository.interface';
import { CreateTenderData, UpdateTenderData } from '../types';

@Injectable()
export class FakeTenderRepository implements ITenderRepository {
  private records = new Map<string, Tender>();

  async findAll(organizationId: string): Promise<Tender[]> {
    return Array.from(this.records.values()).filter(
      (t) => t.organizationId === organizationId,
    );
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<Tender | null> {
    const tender = this.records.get(id);
    if (tender && tender.organizationId === organizationId) {
      return tender;
    }
    return null;
  }

  async create(data: CreateTenderData): Promise<Tender> {
    const tender: Tender = {
      id: randomUUID(),
      title: data.title,
      source: data.source ?? 'manual',
      status: data.status ?? 'intake',
      organizationId: data.organizationId,
      clientCompanyId: data.clientCompanyId,
      sector: null,
      sectorCategory: null,
      sectorConfidence: null,
      sectorClassifiedAt: null,
      sectorInputHash: null,
      sectorModel: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.records.set(tender.id, tender);
    return tender;
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateTenderData,
  ): Promise<Tender> {
    const tender = this.records.get(id);
    if (!tender || tender.organizationId !== organizationId) {
      throw new Error('Tender not found or not in organization');
    }
    if (data.title !== undefined) {
      tender.title = data.title;
    }
    if (data.status !== undefined) {
      tender.status = data.status;
    }
    if (data.source !== undefined) {
      tender.source = data.source;
    }
    if (data.sector !== undefined) {
      tender.sector = data.sector;
    }
    if (data.sectorCategory !== undefined) {
      tender.sectorCategory = data.sectorCategory;
    }
    if (data.sectorConfidence !== undefined) {
      tender.sectorConfidence =
        data.sectorConfidence === null
          ? null
          : new Prisma.Decimal(data.sectorConfidence);
    }
    if (data.sectorClassifiedAt !== undefined) {
      tender.sectorClassifiedAt = data.sectorClassifiedAt;
    }
    if (data.sectorInputHash !== undefined) {
      tender.sectorInputHash = data.sectorInputHash;
    }
    if (data.sectorModel !== undefined) {
      tender.sectorModel = data.sectorModel;
    }
    tender.updatedAt = new Date();
    return tender;
  }

  async delete(
    id: string,
    organizationId: string,
  ): Promise<boolean> {
    const tender = this.records.get(id);
    if (!tender || tender.organizationId !== organizationId) {
      return false;
    }
    return this.records.delete(id);
  }
}
