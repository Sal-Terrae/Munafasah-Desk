import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
import { ComplianceMatrixService } from './compliance-matrix.service';

interface GenerateMatrixBody {
  requirements: ComplianceRequirement[];
  dueDate?: string | null;
  overriddenRequirementIds?: string[];
}

@UseGuards(JwtAuthGuard)
@Controller('tenders/:id/compliance-matrices')
export class ComplianceController {
  constructor(
    private readonly compute: ComplianceService,
    private readonly matrices: ComplianceMatrixService,
    private readonly tenders: TenderService,
    private readonly vault: DocumentVaultService,
  ) {}

  private orgId(req: { user?: { organizationId: string } }): string {
    return req.user!.organizationId;
  }

  // Existing endpoint, NOW PERSISTING. Response shape preserved (matrix
  // + derived tasks + export gate) so the frontend contract is unchanged
  // while a new versioned row is durably stored.
  @Post()
  async generate(
    @Param('id') tenderId: string,
    @Body() body: GenerateMatrixBody,
    @Req() req: { user?: { organizationId: string } },
  ) {
    const org = this.orgId(req);
    const docs = await this.vault.list(org);
    const vault = docs.map((d) => ({
      id: d.id,
      documentType: d.documentType,
      state: d.state,
      expiresAt: d.expiresAt,
    }));
    const { matrix, items } = await this.matrices.generateAndPersist(
      tenderId,
      org,
      body.requirements ?? [],
      vault,
      { dueDate: body.dueDate ?? null },
    );

    // Derived views — kept in the response so the frontend keeps working.
    const computedShape = {
      tenderId,
      version: matrix.version,
      generatedAt: matrix.generatedAt.toISOString(),
      items: items.map((i) => ({
        requirementId: i.requirementId,
        requirementText: i.requirementText,
        category: i.category,
        owner: i.owner,
        risk: i.risk as 'low' | 'medium' | 'high' | 'critical',
        status: i.status as
          | 'missing'
          | 'partial'
          | 'satisfied'
          | 'overridden',
        evidenceDocId: null,
        dueDate: i.dueDate ? i.dueDate.toISOString().slice(0, 10) : null,
      })),
    };
    return {
      matrix: { id: matrix.id, ...computedShape },
      tasks: this.compute.deriveTasks(computedShape),
      exportGate: this.compute.exportGate(
        computedShape,
        body.overriddenRequirementIds ?? [],
      ),
    };
  }

  @Get()
  async list(
    @Param('id') tenderId: string,
    @Req() req: { user?: { organizationId: string } },
  ) {
    return this.matrices.listForTender(tenderId, this.orgId(req));
  }

  @Get(':version')
  async getByVersion(
    @Param('id') tenderId: string,
    @Param('version', ParseIntPipe) version: number,
    @Req() req: { user?: { organizationId: string } },
  ) {
    return this.matrices.getByVersion(tenderId, version, this.orgId(req));
  }
}
