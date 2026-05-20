import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  readResidencyMode,
  ResidencyConfig,
  ResidencyMode,
} from './residency';

export type ProviderJurisdiction = 'ksa' | 'cross_border';

export interface ProviderDescriptor {
  /** Stable name e.g. 'openai', 'vertex', 'aws-textract-me'. */
  name: string;
  /** Where the provider physically processes the data. */
  jurisdiction: ProviderJurisdiction;
  /**
   * Optional safeguard token. If present, the gate accepts cross-border
   * use of this provider *only* when the org has registered the same
   * safeguard via `MUNAFASAH_CROSS_BORDER_SAFEGUARDS`.
   */
  safeguard?: string;
}

export type Sensitivity = 'low' | 'medium' | 'high';

export class ResidencyViolation extends ForbiddenException {}

/**
 * Runtime residency gate. The audit (§4) called this out as a
 * primitive that was env-only and unenforced. This service is the
 * single point any external-provider call site must consult before
 * sending tenant data over the wire.
 *
 * Policy (ksa mode, default):
 *   - `low` sensitivity may use any provider.
 *   - `medium`/`high` sensitivity MUST use a `ksa`-jurisdiction provider.
 *
 * Policy (cross_border mode, opt-in via env):
 *   - `low` sensitivity unconstrained.
 *   - `medium`/`high` may use cross-border providers *iff* the
 *     provider declares a `safeguard` token that's listed in
 *     `MUNAFASAH_CROSS_BORDER_SAFEGUARDS`. Providers without a
 *     safeguard are still refused.
 */
@Injectable()
export class ResidencyGate {
  private _config: ResidencyConfig | null = null;

  /**
   * Test seam — pass an explicit env to override `process.env`.
   * Production code uses the no-arg constructor so Nest's DI doesn't
   * try to inject `process.env` as a class.
   */
  loadFrom(env: NodeJS.ProcessEnv): void {
    this._config = readResidencyMode(env);
  }

  get config(): ResidencyConfig {
    if (!this._config) {
      this._config = readResidencyMode(process.env);
    }
    return this._config;
  }

  /** Returns the configured mode (`'ksa'` by default). */
  get mode(): ResidencyMode {
    return this.config.mode;
  }

  /** True iff the call is allowed under the current policy. */
  isAllowed(provider: ProviderDescriptor, sensitivity: Sensitivity): boolean {
    if (sensitivity === 'low') return true;

    if (provider.jurisdiction === 'ksa') return true;

    // Provider is cross-border + data is medium/high.
    if (this.config.mode === 'ksa') {
      // Policy refuses outright.
      return false;
    }
    // cross_border mode: require a registered safeguard.
    if (!provider.safeguard) return false;
    return this.config.safeguardRegister.includes(provider.safeguard);
  }

  /**
   * Hard gate — throws `ResidencyViolation` (HTTP 403) when the call
   * is not allowed. Use this from inside service code right before
   * the wire call to a cross-border provider.
   */
  assertAllowed(
    provider: ProviderDescriptor,
    sensitivity: Sensitivity,
  ): void {
    if (this.isAllowed(provider, sensitivity)) return;
    throw new ResidencyViolation(
      `residency: ${provider.name} (jurisdiction=${provider.jurisdiction}) ` +
        `is not permitted for ${sensitivity}-sensitivity data under ` +
        `mode=${this.config.mode}` +
        (provider.safeguard
          ? ` (safeguard ${provider.safeguard} not registered)`
          : ' (no safeguard declared)'),
    );
  }
}
