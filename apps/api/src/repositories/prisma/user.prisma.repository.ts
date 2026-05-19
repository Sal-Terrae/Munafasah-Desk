import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { IUserRepository } from '../interfaces/user.repository.interface';
import { CreateUserData, UpdateUserData } from '../types';

@Injectable()
export class UserPrismaRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId },
    });
  }

  async findById(id: string, organizationId: string) {
    return this.prisma.user.findFirst({
      where: { id, organizationId },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findFirst({ where: { email } });
  }

  async create(data: CreateUserData) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        role: data.role,
        password: data.password ?? null,
        organization: { connect: { id: data.organizationId } },
      },
    });
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateUserData,
  ) {
    const result = await this.prisma.user.updateMany({
      where: { id, organizationId },
      data,
    });
    if (result.count === 0) {
      throw new Error(`User not found or not in organization`);
    }
    return this.prisma.user.findUnique({ where: { id } }) as any;
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    const result = await this.prisma.user.deleteMany({
      where: { id, organizationId },
    });
    return result.count > 0;
  }
}
