import {
  Body,
  Controller,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenderService } from '../tender/tender.service';
import { DocumentVaultService } from '../document-vault/document-vault.service';
import {
  ComplianceRequirement,
  ComplianceService,
} from './compliance.service';

interface MatrixBody {
  requirements: ComplianceRequirement[];
  dueDate?: string | null;
  previousVersion?: number;
  overriddenRequirementIds?: string[];
}

@UseGuards(JwtAuthGuard)
@Controller('tenders/:id/compliance-matrix')
export class ComplianceController {
  constructor(
    private readonly compliance: ComplianceService,
    private readonly tenders: TenderService,
    private readonly vault: DocumentVaultService,
  ) {}

  private orgId(req: { user?: { organizationId: string } }): string {
    return req.user!.organizationId;
  }

  @Post()
  async generate(
    @Param('id') id: string,
    @Body() body: MatrixBody,
    @Req() req: { user?: { organizationId: string } },
  ) {
    const org = this.orgId(req);
    await this.tenders.get(id, org); // tenant guard
    const docs = await this.vault.list(org);
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
    return {
      matrix,
      tasks: this.compliance.deriveTasks(matrix),
      exportGate: this.compliance.exportGate(
        matrix,
        body.overriddenRequirementIds ?? [],
      ),
    };
  }
}
