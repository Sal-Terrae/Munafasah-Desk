import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Audited } from '../audit/audit.decorator';
import { DocumentVaultService } from './document-vault.service';
import { ObjectStoreService } from './object-store.service';

interface UploadBody {
  clientCompanyId: string;
  documentType?: string;
  sensitivity?: string;
  expiresAt?: string | null;
}

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/**
 * Multipart-upload endpoint kept in its own controller so the existing
 * JSON-only DocumentVaultController doesn't have to negotiate
 * multipart parsing. Same auth model (JWT cookie). Caps payload size
 * at 25 MB so a careless caller can't OOM the API.
 */
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentUploadController {
  constructor(
    private readonly svc: DocumentVaultService,
    private readonly objectStore: ObjectStoreService,
  ) {}

  private orgId(req: { user?: { organizationId: string } }): string {
    return req.user!.organizationId;
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }),
  )
  @Audited({
    action: 'document.upload',
    entityType: 'ClientDocument',
    entityIdFrom: 'response',
    entityIdKey: 'id',
    detailsFrom: ['clientCompanyId', 'documentType', 'sensitivity'],
  })
  async upload(
    @UploadedFile() file: MulterFile | undefined,
    @Body() body: UploadBody,
    @Req() req: { user?: { organizationId: string } },
  ) {
    if (!file) {
      throw new BadRequestException('file is required (multipart field "file")');
    }
    if (!body.clientCompanyId) {
      throw new BadRequestException('clientCompanyId is required');
    }
    const org = this.orgId(req);
    const doc = await this.svc.register(
      {
        filename: file.originalname,
        clientCompanyId: body.clientCompanyId,
        documentType: body.documentType,
        sensitivity: body.sensitivity,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
      org,
    );
    const key = this.objectStore.buildKey(org, doc.id, file.originalname);
    try {
      await this.objectStore.putObject(
        key,
        file.buffer,
        file.mimetype || 'application/octet-stream',
      );
    } catch (err) {
      // Best-effort row cleanup so a failed put doesn't leave a
      // dangling row claiming to have a blob.
      await this.svc
        .delete(doc.id, org)
        .catch(() => undefined);
      throw new BadRequestException(
        `object-store write failed: ${err instanceof Error ? err.message : err}`,
      );
    }
    return this.svc.attachBlob(doc.id, org, {
      storageKey: key,
      contentType: file.mimetype || 'application/octet-stream',
      sizeBytes: file.size,
    });
  }

  @Get(':id/download')
  async download(
    @Param('id') id: string,
    @Req()
    req: {
      user?: { organizationId: string; role?: import('@prisma/client').UserRole };
    },
  ): Promise<{ url: string; filename: string }> {
    const doc = await this.svc.get(id, this.orgId(req), req.user?.role);
    if (!doc.storageKey) {
      throw new NotFoundException('Document has no uploaded blob');
    }
    const url = await this.objectStore.presignedGetUrl(doc.storageKey);
    return { url, filename: doc.filename };
  }
}
