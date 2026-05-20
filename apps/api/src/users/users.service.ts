import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository } from '../repositories/interfaces/user.repository.interface';
import type { PublicUser } from '../auth/auth.service';
import { USER_REPOSITORY } from '../repositories/tokens';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly repo: IUserRepository,
  ) {}

  async list(organizationId: string): Promise<PublicUser[]> {
    const rows = await this.repo.findAll(organizationId);
    // Strip password and the timestamps that aren't part of PublicUser.
    return rows.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      organizationId: u.organizationId,
    }));
  }
}
