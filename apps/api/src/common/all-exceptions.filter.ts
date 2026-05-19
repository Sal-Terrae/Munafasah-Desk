import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { logEvent } from '../observability/logger';

interface ErrorBody {
  statusCode: number;
  error: string;
  message: string;
  path: string;
  timestamp: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly nestLogger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, error } = this.normalise(exception);

    logEvent(
      status >= 500 ? 'error' : 'warn',
      'request_error',
      {
        method: request.method,
        path: request.url,
        status,
        error,
        message,
      },
    );

    if (status >= 500) {
      this.nestLogger.error(
        `[${status}] ${request.method} ${request.url} — ${error}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body: ErrorBody = {
      statusCode: status,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };
    response.status(status).json(body);
  }

  private normalise(exception: unknown): {
    status: number;
    message: string;
    error: string;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const message =
        typeof res === 'string'
          ? res
          : (res as { message?: string | string[] }).message ??
            exception.message;
      const error =
        typeof res === 'object' && res !== null
          ? ((res as { error?: string }).error ?? exception.name)
          : exception.name;
      return {
        status,
        message: Array.isArray(message) ? message.join('; ') : message,
        error,
      };
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'InternalServerError',
    };
  }
}
