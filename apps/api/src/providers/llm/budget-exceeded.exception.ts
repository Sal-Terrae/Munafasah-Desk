import { HttpException, HttpStatus } from '@nestjs/common';

export interface BudgetExceededDetail {
  reason: 'requests' | 'cost';
  limit: number;
  current: number;
}

/**
 * Fail-closed: when an org has hit its daily LLM budget, every further
 * LLM-spending call must abort. Surfaces as HTTP 429 to API callers so
 * clients can back off; service-internal callers should catch and
 * record a `budget_blocked` audit row.
 */
export class BudgetExceededException extends HttpException {
  constructor(public readonly detail: BudgetExceededDetail) {
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        error: 'BudgetExceeded',
        ...detail,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
