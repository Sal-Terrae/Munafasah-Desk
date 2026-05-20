import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TenderAccessService } from './tender-access.service';
import { AuditService } from '../audit/audit.service';
import { FakeTenderAccessRepository } from '../repositories/fake/fake-tender-access.repository';
import { FakeAuditEventRepository } from '../repositories/fake/fake-audit-event.repository';

const ORG = 'org-1';

function makeSvc() {
  const repo = new FakeTenderAccessRepository();
  const audit = new AuditService(new FakeAuditEventRepository());
  return { svc: new TenderAccessService(repo, audit), repo };
}

describe('TenderAccessService', () => {
  it('grant creates a (user, tender) access row at the requested role', async () => {
    const { svc } = makeSvc();
    const ta = await svc.grant(ORG, 'u-1', 't-1', 'Editor', 'admin-1');
    expect(ta.role).toBe('Editor');
    expect(ta.grantedBy).toBe('admin-1');
  });

  it('rejects an invalid role', async () => {
    const { svc } = makeSvc();
    await expect(
      svc.grant(ORG, 'u-1', 't-1', 'Superuser' as never, 'admin-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('refuses double-grant for the same (user, tender) pair', async () => {
    const { svc } = makeSvc();
    await svc.grant(ORG, 'u-1', 't-1', 'Viewer', 'admin-1');
    await expect(
      svc.grant(ORG, 'u-1', 't-1', 'Editor', 'admin-1'),
    ).rejects.toThrow();
  });

  it('hasAtLeast honors the Owner > Editor > Reviewer > Viewer ladder', async () => {
    const { svc } = makeSvc();
    await svc.grant(ORG, 'u-1', 't-1', 'Editor', 'admin-1');
    expect(await svc.hasAtLeast(ORG, 'u-1', 't-1', 'Viewer')).toBe(true);
    expect(await svc.hasAtLeast(ORG, 'u-1', 't-1', 'Reviewer')).toBe(true);
    expect(await svc.hasAtLeast(ORG, 'u-1', 't-1', 'Editor')).toBe(true);
    expect(await svc.hasAtLeast(ORG, 'u-1', 't-1', 'Owner')).toBe(false);
  });

  it('require throws NotFound when the user lacks access (do not disclose tender existence)', async () => {
    const { svc } = makeSvc();
    await expect(
      svc.require(ORG, 'u-1', 't-1', 'Viewer'),
    ).rejects.toThrow(NotFoundException);
  });

  it('revoke removes the access row (and is no-op when nothing was granted)', async () => {
    const { svc } = makeSvc();
    expect(await svc.revoke(ORG, 'u-1', 't-1', 'admin-1')).toEqual({
      removed: false,
    });
    await svc.grant(ORG, 'u-1', 't-1', 'Reviewer', 'admin-1');
    expect(await svc.revoke(ORG, 'u-1', 't-1', 'admin-1')).toEqual({
      removed: true,
    });
    expect(await svc.findRole(ORG, 'u-1', 't-1')).toBeNull();
  });

  it('is tenant-scoped — listForTender of another org returns []', async () => {
    const { svc } = makeSvc();
    await svc.grant(ORG, 'u-1', 't-1', 'Editor', 'admin-1');
    expect(await svc.listForTender('other-org', 't-1')).toEqual([]);
  });
});
