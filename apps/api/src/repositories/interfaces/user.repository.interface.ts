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
  delete(id: string, organizationId: string): Promise<boolean>;
}
