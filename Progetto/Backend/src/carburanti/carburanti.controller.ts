import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../current-user.decorator';
import { JwtAuthGuard } from '../jwt-auth.guard';
import type { JwtPayload } from '../jwt-payload.interface';
import { richiediPremium } from '../piano';
import { PrismaService } from '../prisma.service';
import { CarburantiService } from './carburanti.service';
import { ViciniDto } from './dto/vicini.dto';

@Controller('carburanti')
export class CarburantiController {
  constructor(
    private readonly carburanti: CarburantiService,
    private readonly prisma: PrismaService,
  ) {}

  /** GET /carburanti/vicini?lat=..&lng=..&carburante=benzina&raggio=5 (Premium) */
  @UseGuards(JwtAuthGuard)
  @Get('vicini')
  async vicini(@Query() q: ViciniDto, @CurrentUser() user: JwtPayload) {
    await richiediPremium(
      this.prisma,
      Number(user.sub),
      'La ricerca dei distributori vicini',
    );
    return this.carburanti.vicini(q.lat, q.lng, q.carburante, q.raggio ?? 5);
  }
}
