import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { VeicoloService } from './veicolo.service';
import { CreateVeicoloDto } from './dto/create-veicolo.dto';
import { JwtAuthGuard } from '../jwt-auth.guard';
@Controller('veicolo')
export class VeicoloController {
  constructor(private readonly veicoloService: VeicoloService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async salva(@Body() dto: CreateVeicoloDto) {
    return this.veicoloService.cercaESalva(dto);
  }
  @UseGuards(JwtAuthGuard)
  @Get('cerca/:targa')
  cerca(@Param('targa') targa: string) {
    return this.veicoloService.cercaSoloDati(targa);
  }
  @UseGuards(JwtAuthGuard)
  @Get('utente/:id')
  async getVeicoliUtente(@Param('id') id: string) {
    return this.veicoloService.getVeicoliByUtente(+id);
  }

  @Get(':id')
  async getVeicolo(@Param('id') id: string) {
    return this.veicoloService.getVeicoloById(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async elimina(@Param('id') id: string) {
    return this.veicoloService.eliminaVeicolo(+id);
  }
}
