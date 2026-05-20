import { User } from '@prisma/client';
import { CreateUserData, UpdateUserData } from '../types';

export interface IUserRepository {
  findAll(organizationId: string): Promise<User[]>;
  findById(id: string, organizationId: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
  update(
    id: string,
    organizationId: string,
    data: UpdateUserData,
  ): Promise<User>;
  /**
   * PDPL right of erasure: replace email/name with pseudonymous values
   * and clear the password hash. Keeps the User row so FKs (audit,
   * tender access) remain referentially intact.
   */
  anonymise(
    id: string,
    organizationId: string,
    pseudonymousEmail: string,
  ): Promise<User>;
  delete(id: string, organizationId: string): Promise<boolean>;
}
