import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenderAccess } from '@prisma/client';
import { ITenderAccessRepository } from '../repositories/interfaces/tender-access.repository.interface';
import { TenderAccessRole } from '../repositories/types';
import { AuditService } from '../audit/audit.service';
import { TENDER_ACCESS_REPOSITORY } from '../repositories/tokens';

const ROLE_RANK: Record<TenderAccessRole, number> = {
  Owner: 4,
  Editor: 3,
  Reviewer: 2,
  Viewer: 1,
};

@Injectable()
export class TenderAccessService {
  constructor(
    @Inject(TENDER_ACCESS_REPOSITORY)
    private readonly repo: ITenderAccessRepository,
    private readonly audit: AuditService,
  ) {}

  async grant(
    organizationId: string,
    userId: string,
    tenderId: string,
    role: TenderAccessRole,
    grantedBy: string,
  ): Promise<TenderAccess> {
    if (!ROLE_RANK[role]) {
      throw new BadRequestException(`invalid role ${role}`);
    }
    const ta = await this.repo.create({
      organizationId,
      userId,
      tenderId,
      role,
      grantedBy,
    });
    await this.audit.record({
      action: 'tender_access.grant',
      entityType: 'TenderAccess',
      entityId: ta.id,
      userId: grantedBy,
      organizationId,
      details: { subjectUserId: userId, tenderId, role },
    });
    return ta;
  }

  async revoke(
    organizationId: string,
    userId: string,
    tenderId: string,
    revokedBy: string,
  ): Promise<{ removed: boolean }> {
    const removed = await this.repo.revoke(userId, tenderId, organizationId);
    if (removed) {
      await this.audit.record({
        action: 'tender_access.revoke',
        entityType: 'TenderAccess',
        entityId: `${userId}:${tenderId}`,
        userId: revokedBy,
        organizationId,
        details: { subjectUserId: userId, tenderId },
      });
    }
    return { removed };
  }

  listForTender(
    organizationId: string,
    tenderId: string,
  ): Promise<TenderAccess[]> {
    return this.repo.findAllForTender(tenderId, organizationId);
  }

  listForUser(
    organizationId: string,
    userId: string,
  ): Promise<TenderAccess[]> {
    return this.repo.findAllForUser(userId, organizationId);
  }

  async findRole(
    organizationId: string,
    userId: string,
    tenderId: string,
  ): Promise<TenderAccessRole | null> {
    const ta = await this.repo.findByUserAndTender(
      userId,
      tenderId,
      organizationId,
    );
    return ta ? (ta.role as TenderAccessRole) : null;
  }

  /** Returns true if the user's role on this tender meets or exceeds `minimum`. */
  async hasAtLeast(
    organizationId: string,
    userId: string,
    tenderId: string,
    minimum: TenderAccessRole,
  ): Promise<boolean> {
    const role = await this.findRole(organizationId, userId, tenderId);
    if (!role) return false;
    return ROLE_RANK[role] >= ROLE_RANK[minimum];
  }

  async require(
    organizationId: string,
    userId: string,
    tenderId: string,
    minimum: TenderAccessRole,
  ): Promise<void> {
    if (
      !(await this.hasAtLeast(organizationId, userId, tenderId, minimum))
    ) {
      throw new NotFoundException('Tender not found');
    }
  }
}
