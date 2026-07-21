import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { StoricoService } from './storico.service';
import {
  CreateInterventoDto,
  UpdateInterventoDto,
} from './dto/create-intervento.dto';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // decommentare se hai l'auth guard

@Controller('interventi')
// @UseGuards(JwtAuthGuard)  // decommentare per proteggere le route con JWT
export class StoricoController {
  constructor(private readonly storicoService: StoricoService) {}

  // GET /interventi/veicolo/:id_veicolo
  // Restituisce tutti gli interventi di un veicolo specifico

  @Get('veicolo/:id_veicolo')
  findByVeicolo(@Param('id_veicolo', ParseIntPipe) idVeicolo: number) {
    return this.storicoService.findByVeicolo(idVeicolo);
  }

  // POST /interventi
  // Body: { id_veicolo, data, categoria, nome, descrizione?, mediante?, costo? }
  @Post()
  create(@Body() dto: CreateInterventoDto) {
    return this.storicoService.create(dto);
  }

  // PUT /interventi/:id
  // Body: { data?, categoria?, nome?, descrizione?, mediante?, costo? }
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInterventoDto,
  ) {
    return this.storicoService.update(id, dto);
  }

  // DELETE /interventi/:id
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.storicoService.remove(id);
  }
}
