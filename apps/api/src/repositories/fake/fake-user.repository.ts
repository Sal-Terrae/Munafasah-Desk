import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { User } from '@prisma/client';
import { IUserRepository } from '../interfaces/user.repository.interface';
import { CreateUserData, UpdateUserData } from '../types';

@Injectable()
export class FakeUserRepository implements IUserRepository {
  private records = new Map<string, User>();

  async findAll(organizationId: string): Promise<User[]> {
    return Array.from(this.records.values()).filter(
      (u) => u.organizationId === organizationId,
    );
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<User | null> {
    const user = this.records.get(id);
    if (user && user.organizationId === organizationId) {
      return user;
    }
    return null;
  }

  async create(data: CreateUserData): Promise<User> {
    const user: User = {
      id: randomUUID(),
      email: data.email,
      name: data.name,
      role: data.role,
      organizationId: data.organizationId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.records.set(user.id, user);
    return user;
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateUserData,
  ): Promise<User> {
    const user = this.records.get(id);
    if (!user || user.organizationId !== organizationId) {
      throw new Error('User not found or not in organization');
    }
    if (data.email !== undefined) user.email = data.email;
    if (data.name !== undefined) user.name = data.name;
    if (data.role !== undefined) user.role = data.role;
    user.updatedAt = new Date();
    return user;
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    const user = this.records.get(id);
    if (!user || user.organizationId !== organizationId) {
      return false;
    }
    return this.records.delete(id);
  }
}
