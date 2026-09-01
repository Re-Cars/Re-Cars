import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { StoricoService } from './storico.service';
import {
  CreateInterventoDto,
  UpdateInterventoDto,
} from './dto/create-intervento.dto';
import { JwtAuthGuard } from '../jwt-auth.guard';
import type { Request } from 'express';

@Controller('interventi')
@UseGuards(JwtAuthGuard)
export class StoricoController {
  constructor(private readonly storicoService: StoricoService) {}

  // GET /interventi/veicolo/:id_veicolo
  // Restituisce tutti gli interventi di un veicolo specifico
  @Get('veicolo/:id_veicolo')
  findByVeicolo(
    @Param('id_veicolo', ParseIntPipe) idVeicolo: number,
    @Req() req: Request,
  ) {
    const userId = Number((req.user as any)?.sub);
    const userType = (req.user as any)?.tipo;
    return this.storicoService.findByVeicolo(idVeicolo, userId, userType);
  }

  // POST /interventi
  // Body: { id_veicolo, data, categoria, nome, descrizione?, mediante?, costo? }
  @Post()
  create(@Body() dto: CreateInterventoDto, @Req() req: Request) {
    const userId = Number((req.user as any)?.sub);
    const userType = (req.user as any)?.tipo;
    return this.storicoService.create(dto, userId, userType);
  }

  // PUT /interventi/:id
  // Body: { data?, categoria?, nome?, descrizione?, mediante?, costo? }
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInterventoDto,
    @Req() req: Request,
  ) {
    const userId = Number((req.user as any)?.sub);
    const userType = (req.user as any)?.tipo;
    return this.storicoService.update(id, dto, userId, userType);
  }

  // DELETE /interventi/:id
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const userId = Number((req.user as any)?.sub);
    const userType = (req.user as any)?.tipo;
    return this.storicoService.remove(id, userId, userType);
  }
}
