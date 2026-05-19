import { Injectable } from '@nestjs/common';
import {
  ComplianceMatrix,
  ComplianceService,
} from '../compliance/compliance.service';

export interface PackArtifact {
  name: string;
  contentType: string;
  content: string;
}

export interface SubmissionPack {
  manifest: {
    schemaVersion: string;
    tenderId: string;
    matrixVersion: number;
    generatedAt: string;
    artifactNames: string[];
    criticalGapsOverridden: string[];
  };
  artifacts: PackArtifact[];
}

export interface BlockedExport {
  blocked: true;
  reason: string;
  blockingRequirementIds: string[];
}

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

@Injectable()
export class ExportService {
  constructor(private readonly compliance: ComplianceService) {}

  /**
   * Build a deterministic, consistently-structured submission pack.
   * Critical, non-satisfied rows block the export unless explicitly
   * overridden (delegates to ComplianceService.exportGate). Real
   * PDF/XLSX/ZIP renderers are pluggable later; MVP emits stable
   * JSON + CSV artifacts.
   */
  build(
    matrix: ComplianceMatrix,
    overriddenRequirementIds: string[] = [],
    now: Date = new Date(),
  ): SubmissionPack | BlockedExport {
    const gate = this.compliance.exportGate(
      matrix,
      overriddenRequirementIds,
    );
    if (!gate.allowed) {
      return {
        blocked: true,
        reason: 'critical compliance gaps block readiness export',
        blockingRequirementIds: gate.blocking.map(
          (i) => i.requirementId,
        ),
      };
    }

    const tasks = this.compliance.deriveTasks(matrix);
    const matrixCsv = [
      'requirementId,category,owner,risk,status,evidenceDocId',
      ...matrix.items.map((i) =>
        [
          i.requirementId,
          i.category,
          i.owner,
          i.risk,
          i.status,
          i.evidenceDocId ?? '',
        ]
          .map((c) => csvEscape(String(c)))
          .join(','),
      ),
    ].join('\n');

    const artifacts: PackArtifact[] = [
      {
        name: 'compliance-matrix.csv',
        contentType: 'text/csv',
        content: matrixCsv,
      },
      {
        name: 'open-tasks.json',
        contentType: 'application/json',
        content: JSON.stringify(tasks),
      },
      {
        name: 'manifest.json',
        contentType: 'application/json',
        content: JSON.stringify({
          tenderId: matrix.tenderId,
          matrixVersion: matrix.version,
          itemCount: matrix.items.length,
        }),
      },
    ];

    return {
      manifest: {
        schemaVersion: '1',
        tenderId: matrix.tenderId,
        matrixVersion: matrix.version,
        generatedAt: now.toISOString(),
        artifactNames: artifacts.map((a) => a.name),
        criticalGapsOverridden: [...overriddenRequirementIds],
      },
      artifacts,
    };
  }
}
