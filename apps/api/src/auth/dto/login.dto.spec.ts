import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { LoginDto } from './login.dto';

async function check(payload: Record<string, unknown>) {
  const dto = plainToInstance(LoginDto, payload);
  return validate(dto);
}

describe('LoginDto', () => {
  it('accepts a well-formed payload', async () => {
    const errors = await check({
      email: 'user@example.com',
      password: 'correct-horse-battery',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects a non-email', async () => {
    const errors = await check({
      email: 'not-an-email',
      password: 'correct-horse-battery',
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('email');
  });

  it('rejects a password shorter than 8 chars', async () => {
    const errors = await check({
      email: 'user@example.com',
      password: 'short',
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('password');
  });

  it('rejects a missing password', async () => {
    const errors = await check({
      email: 'user@example.com',
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('password');
  });

  it('rejects an absurdly long password (DoS guard)', async () => {
    const errors = await check({
      email: 'user@example.com',
      password: 'a'.repeat(300),
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('password');
  });
});
