/**
 * Hard-coded plan catalog. Changes ship via deploy, not via a DB
 * write surface — that keeps plan-rule changes auditable through
 * git history and avoids an "edit plan via API" admin endpoint.
 *
 * Each plan declares per-day quotas that other services consult via
 * UsageCounterService.bumpAndCheck(). Quotas of `null` mean unlimited.
 */
export interface PlanQuota {
  llm_requests: number | null;
  documents_created: number | null;
  webhook_events: number | null;
}

export interface Plan {
  code: 'free' | 'basic' | 'pro';
  name: string;
  monthlyPriceUsd: number;
  /** Stripe Price ID — set in real deployments, kept null in tests. */
  stripePriceId: string | null;
  quotas: PlanQuota;
  features: string[];
}

export const PLAN_CATALOG: ReadonlyArray<Plan> = [
  {
    code: 'free',
    name: 'Free',
    monthlyPriceUsd: 0,
    stripePriceId: null,
    quotas: {
      llm_requests: 100,
      documents_created: 50,
      webhook_events: 100,
    },
    features: [
      '1 organization',
      'Up to 50 documents',
      '100 LLM calls / day',
      'PDPL audit log + DSR handling',
    ],
  },
  {
    code: 'basic',
    name: 'Basic',
    monthlyPriceUsd: 29,
    stripePriceId: process.env.STRIPE_PRICE_BASIC ?? null,
    quotas: {
      llm_requests: 1000,
      documents_created: 500,
      webhook_events: 1000,
    },
    features: [
      'Everything in Free',
      'Up to 500 documents',
      '1,000 LLM calls / day',
      'Email notification driver',
    ],
  },
  {
    code: 'pro',
    name: 'Pro',
    monthlyPriceUsd: 99,
    stripePriceId: process.env.STRIPE_PRICE_PRO ?? null,
    quotas: {
      llm_requests: 10_000,
      documents_created: null,
      webhook_events: 10_000,
    },
    features: [
      'Everything in Basic',
      'Unlimited documents',
      '10,000 LLM calls / day',
      'Slack + WhatsApp + ntfy notification drivers',
      'Public webhook subscriptions',
    ],
  },
];

export function findPlan(code: string): Plan | undefined {
  return PLAN_CATALOG.find((p) => p.code === code);
}

export function findPlanByStripePriceId(priceId: string): Plan | undefined {
  return PLAN_CATALOG.find((p) => p.stripePriceId === priceId);
}
