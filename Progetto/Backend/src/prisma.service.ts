import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * from '@prisma/client/default';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {

constructor() {
  super({} as any);
}

  async onModuleInit() {
    await this.$connect();
    console.log("✅ Database connesso correttamente!");
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}