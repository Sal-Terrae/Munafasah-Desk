import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { UserPrismaRepository } from '../repositories/prisma/user.prisma.repository';
import { IUserRepository } from '../repositories/interfaces/user.repository.interface';

@Injectable()
export class AuthService {
  constructor(
    @Inject(UserPrismaRepository)
    private readonly users: IUserRepository,
    private readonly jwt: JwtService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.users.findByEmail(email);
    if (user && user.password && bcrypt.compareSync(password, user.password)) {
      return user;
    }
    return null;
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ access_token: string }> {
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const access_token = await this.jwt.signAsync({
      sub: user.id,
      organizationId: user.organizationId,
      role: user.role,
    });
    return { access_token };
  }
}
