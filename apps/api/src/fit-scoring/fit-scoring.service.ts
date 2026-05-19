import { Injectable } from '@nestjs/common';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface FitSignals {
  /** 0..1 — how well capability matches the tender scope. */
  capability: number;
  /** Calendar days until the submission deadline. */
  daysToDeadline: number;
  /** 0..1 — share of required evidence already available/valid. */
  evidenceReadiness: number;
  riskLevel: RiskLevel;
  sector?: string;
}

export interface FactorBreakdown {
  name: string;
  weight: number;
  raw: number;
  contribution: number; // weight * raw * 100, rounded
}

export interface FitScore {
  computedScore: number; // 0..100
  factors: FactorBreakdown[];
  recommendation: 'bid' | 'review' | 'no_bid';
  overridden: boolean;
  finalScore: number;
  overrideReason?: string;
  sector: string;
}

type Weights = {
  capability: number;
  timeline: number;
  evidence: number;
  risk: number;
};

// Sector packs: deterministic weight presets (must each sum to 1).
const SECTOR_PACKS: Record<string, Weights> = {
  default: { capability: 0.35, timeline: 0.2, evidence: 0.3, risk: 0.15 },
  construction: {
    capability: 0.3,
    timeline: 0.15,
    evidence: 0.35,
    risk: 0.2,
  },
  technology: {
    capability: 0.45,
    timeline: 0.2,
    evidence: 0.2,
    risk: 0.15,
  },
  medical_supply: {
    capability: 0.3,
    timeline: 0.15,
    evidence: 0.4,
    risk: 0.15,
  },
};

const RISK_RAW: Record<RiskLevel, number> = {
  low: 1.0,
  medium: 0.6,
  high: 0.25,
};

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function timelineRaw(days: number): number {
  if (days >= 21) return 1.0;
  if (days <= 3) return 0.1;
  // linear 3..21 days -> 0.1..1.0
  return Number((0.1 + ((days - 3) / 18) * 0.9).toFixed(4));
}

@Injectable()
export class FitScoringService {
  score(signals: FitSignals): FitScore {
    const sector = (signals.sector ?? 'default').toLowerCase();
    const w = SECTOR_PACKS[sector] ?? SECTOR_PACKS.default;

    const raws = {
      capability: clamp01(signals.capability),
      timeline: timelineRaw(signals.daysToDeadline),
      evidence: clamp01(signals.evidenceReadiness),
      risk: RISK_RAW[signals.riskLevel] ?? RISK_RAW.high,
    };

    const factors: FactorBreakdown[] = [
      ['capability', w.capability, raws.capability],
      ['timeline', w.timeline, raws.timeline],
      ['evidence', w.evidence, raws.evidence],
      ['risk', w.risk, raws.risk],
    ].map(([name, weight, raw]) => ({
      name: name as string,
      weight: weight as number,
      raw: raw as number,
      contribution: Math.round(
        (weight as number) * (raw as number) * 100,
      ),
    }));

    const computedScore = factors.reduce(
      (s, f) => s + f.contribution,
      0,
    );
    const recommendation =
      computedScore >= 70
        ? 'bid'
        : computedScore >= 40
          ? 'review'
          : 'no_bid';

    return {
      computedScore,
      factors,
      recommendation,
      overridden: false,
      finalScore: computedScore,
      sector: SECTOR_PACKS[sector] ? sector : 'default',
    };
  }

  override(
    signals: FitSignals,
    overrideScore: number,
    reason: string,
  ): FitScore {
    if (!reason || !reason.trim()) {
      throw new Error('override requires a reason');
    }
    if (overrideScore < 0 || overrideScore > 100) {
      throw new Error('override score must be between 0 and 100');
    }
    const base = this.score(signals);
    const recommendation =
      overrideScore >= 70
        ? 'bid'
        : overrideScore >= 40
          ? 'review'
          : 'no_bid';
    return {
      ...base,
      overridden: true,
      finalScore: overrideScore,
      overrideReason: reason.trim(),
      recommendation,
    };
  }
}
