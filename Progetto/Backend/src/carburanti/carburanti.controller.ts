import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { CarburantiService } from './carburanti.service';
import { ViciniDto } from './dto/vicini.dto';

@Controller('carburanti')
export class CarburantiController {
  constructor(private readonly carburanti: CarburantiService) {}

  /** GET /carburanti/vicini?lat=..&lng=..&carburante=benzina&raggio=5 */
  @UseGuards(JwtAuthGuard)
  @Get('vicini')
  vicini(@Query() q: ViciniDto) {
    return this.carburanti.vicini(q.lat, q.lng, q.carburante, q.raggio ?? 5);
  }
}
