import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Tender } from '@prisma/client';
import { ITenderRepository } from '../repositories/interfaces/tender.repository.interface';
import { TENDER_REPOSITORY } from '../repositories/tokens';

export type TenderSource = 'manual' | 'upload' | 'email' | 'link';

@Injectable()
export class TenderService {
  constructor(
    @Inject(TENDER_REPOSITORY)
    private readonly repo: ITenderRepository,
  ) {}

  intake(
    title: string,
    clientCompanyId: string,
    organizationId: string,
    source: TenderSource = 'manual',
  ): Promise<Tender> {
    return this.repo.create({
      title,
      organizationId,
      clientCompanyId,
      source,
      status: 'intake',
    });
  }

  list(organizationId: string): Promise<Tender[]> {
    return this.repo.findAll(organizationId);
  }

  async get(id: string, organizationId: string): Promise<Tender> {
    const tender = await this.repo.findById(id, organizationId);
    if (!tender) {
      throw new NotFoundException('Tender not found');
    }
    return tender;
  }

  updateStatus(
    id: string,
    organizationId: string,
    status: string,
  ): Promise<Tender> {
    return this.repo.update(id, organizationId, { status });
  }

  remove(id: string, organizationId: string): Promise<boolean> {
    return this.repo.delete(id, organizationId);
  }
}
