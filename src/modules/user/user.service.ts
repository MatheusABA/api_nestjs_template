import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
// import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private prismaService: PrismaService) {}

  async createUser(createUserDto: CreateUserDto) {
    await Promise.all([
      this.findByEmail(createUserDto.email),
      this.findByUsername(createUserDto.username),
    ]).then(([email, username]) => {
      if (email) {
        throw new BadRequestException('User with this email already exists');
      }
      if (username) {
        throw new BadRequestException('User with this username already exists');
      }
    });

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(createUserDto.password, saltRounds);
    const user = await this.prismaService.user.create({
      data: {
        username: createUserDto.username,
        email: createUserDto.email,
        password: passwordHash,
      },
    });

    return user;
  }

  findAll() {
    const users = this.prismaService.user.findMany();
    return users;
  }

  findOne(id: string) {
    return this.prismaService.user.findFirst({
      where: {
        id,
      },
    });
  }

  findByEmail(email: string) {
    return this.prismaService.user.findFirst({
      where: {
        email,
      },
    });
  }

  findByUsername(username: string) {
    return this.prismaService.user.findFirst({
      where: {
        username,
      },
    });
  }

  // update(id: number, updateUserDto: UpdateUserDto) {
  //   return `This action updates a #${id} user`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} user`;
  // }
}
