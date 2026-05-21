import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DpoTrainingService } from './dpo-training.service';
import { FakeDpoTrainingRecordRepository } from '../repositories/fake/fake-dpo-training-record.repository';

const day = (offset: number, base = new Date('2026-05-21T00:00:00Z')) =>
  new Date(base.getTime() + offset * 86_400_000);

describe('DpoTrainingService', () => {
  let repo: FakeDpoTrainingRecordRepository;
  let svc: DpoTrainingService;
  const NOW = new Date('2026-05-21T00:00:00Z');

  beforeEach(() => {
    repo = new FakeDpoTrainingRecordRepository();
    svc = new DpoTrainingService(repo);
  });

  const baseInput = {
    subjectName: 'Sara',
    subjectEmail: 'sara@example.com',
    topic: 'PDPL Awareness',
    completedAt: day(-30),
    validUntil: day(335), // ~11 months later
  };

  it('creates a record and exposes it via list within the org', async () => {
    const r = await svc.create('org-1', 'admin-1', baseInput);
    expect(r.subjectEmail).toBe('sara@example.com');
    expect(r.recordedBy).toBe('admin-1');
    const list = await svc.list('org-1', {}, NOW);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(r.id);
  });

  it('normalises whitespace + lowercases email', async () => {
    const r = await svc.create('org-1', 'admin-1', {
      ...baseInput,
      subjectName: '  Sara  ',
      subjectEmail: '  SARA@example.com ',
      topic: '  PDPL Awareness  ',
    });
    expect(r.subjectName).toBe('Sara');
    expect(r.subjectEmail).toBe('sara@example.com');
    expect(r.topic).toBe('PDPL Awareness');
  });

  it('rejects missing/invalid fields', async () => {
    await expect(
      svc.create('org-1', 'admin-1', { ...baseInput, subjectName: ' ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      svc.create('org-1', 'admin-1', { ...baseInput, subjectEmail: 'noatsign' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      svc.create('org-1', 'admin-1', { ...baseInput, topic: '' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects validUntil earlier than completedAt', async () => {
    await expect(
      svc.create('org-1', 'admin-1', {
        ...baseInput,
        completedAt: day(0),
        validUntil: day(-5),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('classifies expiry status correctly', async () => {
    const expired = await svc.create('org-1', 'admin-1', {
      ...baseInput,
      subjectEmail: 'a@x.com',
      completedAt: day(-400),
      validUntil: day(-1),
    });
    const expiring = await svc.create('org-1', 'admin-1', {
      ...baseInput,
      subjectEmail: 'b@x.com',
      completedAt: day(-30),
      validUntil: day(30), // within 60-day window
    });
    const active = await svc.create('org-1', 'admin-1', {
      ...baseInput,
      subjectEmail: 'c@x.com',
      completedAt: day(-30),
      validUntil: day(120),
    });
    const noExpiry = await svc.create('org-1', 'admin-1', {
      ...baseInput,
      subjectEmail: 'd@x.com',
      completedAt: day(-30),
      validUntil: null,
    });
    const list = await svc.list('org-1', {}, NOW);
    const byId = (id: string) => list.find((r) => r.id === id)!;
    expect(byId(expired.id).expiryStatus).toBe('expired');
    expect(byId(expiring.id).expiryStatus).toBe('expiring');
    expect(byId(active.id).expiryStatus).toBe('active');
    expect(byId(noExpiry.id).expiryStatus).toBe('no-expiry');
  });

  it('filters by expiryStatus when status is provided', async () => {
    await svc.create('org-1', 'admin-1', {
      ...baseInput,
      subjectEmail: 'exp@x.com',
      completedAt: day(-400),
      validUntil: day(-1),
    });
    await svc.create('org-1', 'admin-1', {
      ...baseInput,
      subjectEmail: 'act@x.com',
      completedAt: day(-30),
      validUntil: day(200),
    });
    const active = await svc.list('org-1', { status: 'active' }, NOW);
    expect(active).toHaveLength(1);
    expect(active[0].subjectEmail).toBe('act@x.com');
    const expired = await svc.list('org-1', { status: 'expired' }, NOW);
    expect(expired).toHaveLength(1);
    expect(expired[0].subjectEmail).toBe('exp@x.com');
  });

  it('returns counts via summary()', async () => {
    await svc.create('org-1', 'admin-1', {
      ...baseInput,
      subjectEmail: 'a@x.com',
      completedAt: day(-400),
      validUntil: day(-1),
    });
    await svc.create('org-1', 'admin-1', {
      ...baseInput,
      subjectEmail: 'b@x.com',
      completedAt: day(-30),
      validUntil: day(30),
    });
    await svc.create('org-1', 'admin-1', {
      ...baseInput,
      subjectEmail: 'c@x.com',
      completedAt: day(-30),
      validUntil: day(200),
    });
    await svc.create('org-1', 'admin-1', {
      ...baseInput,
      subjectEmail: 'd@x.com',
      completedAt: day(-30),
      validUntil: null,
    });
    const s = await svc.summary('org-1', NOW);
    expect(s).toEqual({
      total: 4,
      active: 1,
      expiring: 1,
      expired: 1,
      noExpiry: 1,
    });
  });

  it('denies cross-tenant get/update/delete', async () => {
    const r = await svc.create('org-1', 'admin-1', baseInput);
    await expect(svc.get(r.id, 'org-2')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      svc.update(r.id, 'org-2', { topic: 'X' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.remove(r.id, 'org-2')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    // Row still exists for the rightful owner.
    expect((await svc.get(r.id, 'org-1')).id).toBe(r.id);
  });

  it('updates a record and re-enriches expiry status', async () => {
    const r = await svc.create('org-1', 'admin-1', {
      ...baseInput,
      completedAt: day(-30),
      validUntil: day(-1),
    });
    expect((await svc.get(r.id, 'org-1', NOW)).expiryStatus).toBe('expired');
    const updated = await svc.update(r.id, 'org-1', {
      validUntil: day(120),
    });
    expect(updated.expiryStatus).toBe('active');
  });

  it('rejects update validation', async () => {
    const r = await svc.create('org-1', 'admin-1', baseInput);
    await expect(svc.update(r.id, 'org-1', { topic: '' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      svc.update(r.id, 'org-1', { subjectEmail: 'bad' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('delete + 404 on subsequent get', async () => {
    const r = await svc.create('org-1', 'admin-1', baseInput);
    await svc.remove(r.id, 'org-1');
    await expect(svc.get(r.id, 'org-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
