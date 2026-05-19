import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenderService } from '../tender/tender.service';
import { DocumentVaultService } from '../document-vault/document-vault.service';
import { AuditService } from '../audit/audit.service';
import {
  ComplianceRequirement,
  ComplianceService,
} from '../compliance/compliance.service';
import { ExportService } from './export.service';

interface ExportBody {
  requirements: ComplianceRequirement[];
  dueDate?: string | null;
  previousVersion?: number;
  overriddenRequirementIds?: string[];
}

@UseGuards(JwtAuthGuard)
@Controller('tenders/:id/submission-pack')
export class ExportController {
  constructor(
    private readonly tenders: TenderService,
    private readonly vault: DocumentVaultService,
    private readonly compliance: ComplianceService,
    private readonly exporter: ExportService,
    private readonly audit: AuditService,
  ) {}

  @Post()
  async build(
    @Param('id') id: string,
    @Body() body: ExportBody,
    @Req()
    req: { user?: { userId: string; organizationId: string } },
  ) {
    const userId = req.user!.userId;
    const organizationId = req.user!.organizationId;
    await this.tenders.get(id, organizationId); // tenant guard
    const docs = await this.vault.list(organizationId);
    const matrix = this.compliance.generateMatrix(
      id,
      body.requirements ?? [],
      docs.map((d) => ({
        id: d.id,
        documentType: d.documentType,
        state: d.state,
        expiresAt: d.expiresAt,
      })),
      {
        dueDate: body.dueDate ?? null,
        previousVersion: body.previousVersion,
      },
    );
    const result = this.exporter.build(
      matrix,
      body.overriddenRequirementIds ?? [],
    );
    if ('blocked' in result && result.blocked) {
      throw new HttpException(result, HttpStatus.CONFLICT);
    }
    await this.audit.record({
      action: 'submission_pack_exported',
      entityType: 'Tender',
      entityId: id,
      userId,
      organizationId,
      details: {
        matrixVersion: matrix.version,
        artifacts: (result as { manifest: { artifactNames: string[] } })
          .manifest.artifactNames,
      },
    });
    return result;
  }
}
