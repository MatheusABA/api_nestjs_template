import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly configService: ConfigService) {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL as string,
    });
    super({
      adapter,
    });
  }

  private readonly prismaLogger = new Logger(PrismaService.name);

  async onModuleInit() {
    this.prismaLogger.log('Connecting to the database');
    await Promise.all([this.$connect()]).then(() => {
      this.prismaLogger.log('Connected to the database');
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
