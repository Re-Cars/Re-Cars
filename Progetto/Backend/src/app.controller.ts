import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('citta')
  async cercaCitta(@Query('q') q: string) {
    if (!q || q.length < 2) return [];
    return this.prisma.citta.findMany({
      where: {
        OR: [
          { nome: { contains: q, mode: 'insensitive' } },
          { sigla: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 8,
    });
  }
}
