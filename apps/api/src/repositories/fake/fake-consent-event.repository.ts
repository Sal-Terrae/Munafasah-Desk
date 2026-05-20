import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ConsentEvent } from '@prisma/client';
import { IConsentEventRepository } from '../interfaces/consent-event.repository.interface';
import { CreateConsentEventData } from '../types';

@Injectable()
export class FakeConsentEventRepository implements IConsentEventRepository {
  private records = new Map<string, ConsentEvent>();

  async create(data: CreateConsentEventData): Promise<ConsentEvent> {
    const now = new Date();
    const ev: ConsentEvent = {
      id: randomUUID(),
      organizationId: data.organizationId,
      subjectEmail: data.subjectEmail,
      subjectUserId: data.subjectUserId ?? null,
      purpose: data.purpose,
      state: data.state,
      source: data.source ?? 'api',
      recordedBy: data.recordedBy ?? null,
      details: data.details ?? null,
      recordedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    this.records.set(ev.id, ev);
    return { ...ev };
  }

  async findAllForSubject(
    subjectEmail: string,
    organizationId: string,
  ): Promise<ConsentEvent[]> {
    return Array.from(this.records.values())
      .filter(
        (e) =>
          e.subjectEmail === subjectEmail &&
          e.organizationId === organizationId,
      )
      .map((e) => ({ ...e }));
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<ConsentEvent | null> {
    const e = this.records.get(id);
    return e && e.organizationId === organizationId ? { ...e } : null;
  }

  async findCurrent(
    subjectEmail: string,
    purpose: string,
    organizationId: string,
  ): Promise<ConsentEvent | null> {
    const matches = Array.from(this.records.values())
      .filter(
        (e) =>
          e.subjectEmail === subjectEmail &&
          e.purpose === purpose &&
          e.organizationId === organizationId,
      )
      .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
    return matches.length ? { ...matches[0] } : null;
  }

  async anonymiseSubject(
    subjectEmail: string,
    organizationId: string,
    pseudonymousEmail: string,
  ): Promise<number> {
    let count = 0;
    for (const e of this.records.values()) {
      if (
        e.subjectEmail === subjectEmail &&
        e.organizationId === organizationId
      ) {
        e.subjectEmail = pseudonymousEmail;
        e.subjectUserId = null;
        count++;
      }
    }
    return count;
  }
}
