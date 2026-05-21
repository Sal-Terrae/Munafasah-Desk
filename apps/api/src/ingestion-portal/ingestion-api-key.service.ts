import { randomBytes } from 'crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { IngestionApiKey } from '@prisma/client';
import { IIngestionApiKeyRepository } from '../repositories/interfaces/ingestion-api-key.repository.interface';
import { INGESTION_API_KEY_REPOSITORY } from '../repositories/tokens';

const BCRYPT_COST = 10;
const PREFIX_LEN = 8;

export interface MintedKey {
  key: IngestionApiKey;
  /** Raw key — returned ONCE on mint, never again. */
  rawKey: string;
}

/**
 * IngestionApiKey is the per-org bearer used by the
 * bidready-tender-ingestion service when it POSTs enriched tenders
 * to /ingestion/tenders. Raw key is shown to the operator once;
 * subsequent lookups bcrypt-compare the presented key against
 * keyHash.
 *
 * verify(raw) — invariant: rejects revoked, time-bounded by bcrypt's
 * own constant-time compare. Returns the matching IngestionApiKey on
 * success so the caller can attach organizationId to the request.
 */
@Injectable()
export class IngestionApiKeyService {
  private readonly log = new Logger(IngestionApiKeyService.name);

  constructor(
    @Inject(INGESTION_API_KEY_REPOSITORY)
    private readonly repo: IIngestionApiKeyRepository,
  ) {}

  async mint(
    organizationId: string,
    createdBy: string,
    name: string,
  ): Promise<MintedKey> {
    const cleaned = name.trim();
    if (!cleaned) {
      throw new BadRequestException('name required');
    }
    // 32 bytes ≈ 256 bits of entropy, hex-encoded. Prefix the first
    // 8 chars (= 32 bits, plenty for an O(1) DB lookup, not enough
    // to brute-force the remainder of the key offline).
    const raw = randomBytes(32).toString('hex');
    const keyPrefix = raw.slice(0, PREFIX_LEN);
    const keyHash = await bcrypt.hash(raw, BCRYPT_COST);
    const row = await this.repo.create({
      organizationId,
      name: cleaned,
      keyPrefix,
      keyHash,
      createdBy,
    });
    return { key: row, rawKey: raw };
  }

  /** Returns the matching active key or null. Never throws. */
  async verify(raw: string): Promise<IngestionApiKey | null> {
    if (!raw || raw.length < PREFIX_LEN) return null;
    const prefix = raw.slice(0, PREFIX_LEN);
    const candidate = await this.repo.findByPrefix(prefix);
    if (!candidate || candidate.revokedAt) return null;
    const ok = await bcrypt.compare(raw, candidate.keyHash);
    if (!ok) return null;
    // Side-effect: bump lastUsedAt. Failures are non-fatal.
    this.repo.markUsed(candidate.id).catch((err) => {
      this.log.warn(
        `markUsed failed for id=${candidate.id}: ${(err as Error).message}`,
      );
    });
    return candidate;
  }

  list(organizationId: string): Promise<IngestionApiKey[]> {
    return this.repo.findAllByOrg(organizationId);
  }

  revoke(
    id: string,
    organizationId: string,
  ): Promise<IngestionApiKey> {
    return this.repo.revoke(id, organizationId);
  }
}
