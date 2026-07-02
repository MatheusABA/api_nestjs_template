import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private prismaService: PrismaService) {}

  private async validateExistingUser(
    email: string,
    displayName: string,
    excludeId?: string,
  ) {
    const [existingByEmail, existingByDisplayName] = await Promise.all([
      this.prismaService.user.findFirst({
        where: {
          email,
          deletedAt: null,
          ...(excludeId && { id: { not: excludeId } }),
        },
      }),
      this.prismaService.user.findFirst({
        where: {
          displayName,
          deletedAt: null,
          ...(excludeId && { id: { not: excludeId } }),
        },
      }),
    ]);

    if (existingByEmail) {
      throw new BadRequestException('Email already exists');
    }
    if (existingByDisplayName) {
      throw new BadRequestException('Display name already taken');
    }
  }

  async createUser(createUserDto: CreateUserDto) {
    await this.validateExistingUser(
      createUserDto.email,
      createUserDto.displayName,
    );

    await this.prismaService.user.updateMany({
      where: { email: createUserDto.email, deletedAt: { not: null } },
      data: { email: `deleted_${Date.now()}_${createUserDto.email}` },
    });

    await this.prismaService.user.updateMany({
      where: { username: createUserDto.username, deletedAt: { not: null } },
      data: { username: `deleted_${Date.now()}_${createUserDto.username}` },
    });

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(createUserDto.password, saltRounds);
    const user = await this.prismaService.user.create({
      data: {
        displayName: createUserDto.displayName,
        username: createUserDto.username,
        email: createUserDto.email,
        password: passwordHash,
      },
    });

    return user;
  }

  async findAll() {
    const users = await this.prismaService.user.findMany();

    if (users.length === 0) {
      throw new NotFoundException('No users have been found');
    }
    return users;
  }

  async findById(id: string) {
    const user = await this.prismaService.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
    if (!user) {
      throw new NotFoundException('User not exists');
    }
    return user;
  }

  async findByEmail(email: string) {
    const user = await this.prismaService.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
    });
    if (!user) {
      throw new NotFoundException('User not exists');
    }
    return user;
  }

  async findByUsername(username: string) {
    const user = await this.prismaService.user.findFirst({
      where: {
        username,
        deletedAt: null,
      },
    });
    if (!user) {
      throw new NotFoundException('User not exists');
    }
    return user;
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findById(id);

    if (updateUserDto.email || updateUserDto.displayName) {
      await this.validateExistingUser(
        updateUserDto.email ?? user.email,
        updateUserDto.displayName ?? user.displayName,
        id,
      );
    }
    return this.prismaService.user.update({
      where: {
        id,
      },
      data: {
        displayName: updateUserDto.displayName,
        username: updateUserDto.username,
        email: updateUserDto.email,
        updatedAt: new Date(),
      },
    });
  }

  async removeUser(id: string) {
    await this.findById(id);
    return this.prismaService.user.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
