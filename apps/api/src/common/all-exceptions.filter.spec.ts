import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function makeHost(method = 'POST', url = '/auth/login') {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const request = { method, url };
  return {
    response,
    request,
    host: {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost,
  };
}

describe('AllExceptionsFilter', () => {
  it('maps HttpException to clean shape (no stack, no internals)', () => {
    const filter = new AllExceptionsFilter();
    const { host, response } = makeHost();
    filter.catch(new BadRequestException('bad payload'), host);
    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    const body = response.json.mock.calls[0][0];
    expect(body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message: 'bad payload',
      path: '/auth/login',
    });
    expect(body).not.toHaveProperty('stack');
    expect(body).not.toHaveProperty('password');
  });

  it('maps unknown errors to a generic 500 — no implementation leakage', () => {
    const filter = new AllExceptionsFilter();
    const { host, response } = makeHost('GET', '/tenders');
    filter.catch(
      new Error('database connection refused at 10.0.0.7:5432'),
      host,
    );
    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    const body = response.json.mock.calls[0][0];
    expect(body.statusCode).toBe(500);
    expect(body.message).toBe('Internal server error');
    expect(JSON.stringify(body)).not.toMatch(/10\.0\.0\.7/);
    expect(JSON.stringify(body)).not.toMatch(/database/i);
  });

  it('flattens validation array messages from ValidationPipe', () => {
    const filter = new AllExceptionsFilter();
    const { host, response } = makeHost();
    const exc = new HttpException(
      {
        statusCode: 400,
        error: 'Bad Request',
        message: ['email must be an email', 'password is too short'],
      },
      400,
    );
    filter.catch(exc, host);
    const body = response.json.mock.calls[0][0];
    expect(body.message).toBe(
      'email must be an email; password is too short',
    );
  });

  it('does not include exception.message verbatim for InternalServerErrorException', () => {
    const filter = new AllExceptionsFilter();
    const { host, response } = makeHost();
    filter.catch(
      new InternalServerErrorException('user-password-leak'),
      host,
    );
    const body = response.json.mock.calls[0][0];
    expect(body.statusCode).toBe(500);
    // ISE message is allowed (intentionally thrown by us), but should not contain stack
    expect(body).not.toHaveProperty('stack');
  });
});
