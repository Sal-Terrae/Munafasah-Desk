import {
  assertTenancy,
  inspectTenancy,
  isStrictTenancyMode,
  TenancyViolationError,
} from './tenancy';

describe('inspectTenancy (pure)', () => {
  it('lets non-tenant-scoped models pass', () => {
    const r = inspectTenancy('Organization', 'findMany', { where: {} });
    expect(r.ok).toBe(true);
    expect(r.reason).toBe('no-enforcement-needed');
  });

  it('lets unenforced operations pass on tenant-scoped models', () => {
    const r = inspectTenancy('Tender', 'create', { data: { x: 1 } });
    expect(r.ok).toBe(true);
    expect(r.reason).toBe('no-enforcement-needed');
  });

  it('accepts a where containing organizationId', () => {
    const r = inspectTenancy('Tender', 'findMany', {
      where: { organizationId: 'org-1' },
    });
    expect(r.ok).toBe(true);
    expect(r.reason).toBe('has-organizationId');
  });

  it('accepts a where AND-array containing organizationId', () => {
    const r = inspectTenancy('Tender', 'findFirst', {
      where: {
        AND: [{ status: 'open' }, { organizationId: 'org-1' }],
      },
    });
    expect(r.ok).toBe(true);
    expect(r.reason).toBe('has-organizationId');
  });

  it('accepts safe-bypass-key lookup on User by email', () => {
    const r = inspectTenancy('User', 'findUnique', {
      where: { email: 'user@example.com' },
    });
    expect(r.ok).toBe(true);
    expect(r.reason).toBe('has-safe-bypass-key');
  });

  it('accepts InboundEmail lookup by messageId', () => {
    const r = inspectTenancy('InboundEmail', 'findUnique', {
      where: { messageId: '<m-1@x>' },
    });
    expect(r.ok).toBe(true);
    expect(r.reason).toBe('has-safe-bypass-key');
  });

  it('flags a tenant-scoped read missing organizationId', () => {
    const r = inspectTenancy('Tender', 'findMany', {
      where: { status: 'open' },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('organizationId-missing');
  });

  it('flags a tenant-scoped read with no where at all', () => {
    const r = inspectTenancy('Tender', 'findMany', {});
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('where-missing-or-empty');
  });

  it('flags a tenant-scoped updateMany without organizationId', () => {
    const r = inspectTenancy('ClientCompany', 'updateMany', {
      where: { id: 'cc-1' },
      data: { name: 'X' },
    });
    expect(r.ok).toBe(false);
  });
});

describe('assertTenancy (enforcement)', () => {
  it('returns silently when ok', () => {
    expect(() =>
      assertTenancy(
        'Tender',
        'findMany',
        { where: { organizationId: 'org-1' } },
        { strict: true },
      ),
    ).not.toThrow();
  });

  it('logs but does not throw in non-strict mode', () => {
    const logs: string[] = [];
    expect(() =>
      assertTenancy(
        'Tender',
        'findMany',
        { where: { status: 'open' } },
        { strict: false, log: (m) => logs.push(m) },
      ),
    ).not.toThrow();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toContain('tenancy');
    expect(logs[0]).toContain('Tender');
  });

  it('throws TenancyViolationError in strict mode', () => {
    expect(() =>
      assertTenancy(
        'Tender',
        'findMany',
        { where: { status: 'open' } },
        { strict: true },
      ),
    ).toThrow(TenancyViolationError);
  });
});

describe('isStrictTenancyMode', () => {
  it('returns true only when env is exactly "true"', () => {
    expect(isStrictTenancyMode({})).toBe(false);
    expect(isStrictTenancyMode({ TENANCY_STRICT_MODE: 'false' })).toBe(false);
    expect(isStrictTenancyMode({ TENANCY_STRICT_MODE: '1' })).toBe(false);
    expect(isStrictTenancyMode({ TENANCY_STRICT_MODE: 'true' })).toBe(true);
  });
});
