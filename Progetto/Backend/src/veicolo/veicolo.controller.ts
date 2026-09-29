import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { VeicoloService } from './veicolo.service';
import { CreateVeicoloDto } from './dto/create-veicolo.dto';
import { CreateVeicoloManualeDto } from './dto/create-veicolo-manuale.dto';
import { JwtAuthGuard } from '../jwt-auth.guard';
import type { Request } from 'express';

/**
 * Solo gli utenti hanno un garage: con il token di un'officina `sub` è
 * l'id dell'officina e il veicolo finirebbe all'utente con lo stesso id.
 */
function soloUtente(req: Request): number {
  if (req.user?.tipo === 'officina') {
    throw new ForbiddenException('Le officine non hanno un garage');
  }
  return Number(req.user?.sub);
}

@Controller('veicolo')
export class VeicoloController {
  constructor(private readonly veicoloService: VeicoloService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async salva(@Body() dto: CreateVeicoloDto, @Req() req: Request) {
    const userId = soloUtente(req);
    return this.veicoloService.cercaESalva(dto, userId);
  }

  /** Veicolo inserito a mano con i dati del libretto. */
  @UseGuards(JwtAuthGuard)
  @Post('manuale')
  async salvaManuale(
    @Body() dto: CreateVeicoloManualeDto,
    @Req() req: Request,
  ) {
    const userId = soloUtente(req);
    return this.veicoloService.salvaManuale(dto, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('cerca/:targa')
  cerca(@Param('targa') targa: string, @Req() req: Request) {
    return this.veicoloService.cercaSoloDati(targa, soloUtente(req));
  }

  @UseGuards(JwtAuthGuard)
  @Get('utente/:id')
  async getVeicoliUtente(@Param('id') id: string, @Req() req: Request) {
    const userId = Number(req.user?.sub);
    if (userId !== +id) {
      throw new ForbiddenException(
        'Non autorizzato ad accedere ai veicoli di questo utente',
      );
    }
    return this.veicoloService.getVeicoliByUtente(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getVeicolo(@Param('id') id: string, @Req() req: Request) {
    const userId = Number(req.user?.sub);
    const userType = req.user?.tipo;
    return this.veicoloService.getVeicoloById(+id, userId, userType);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async elimina(@Param('id') id: string, @Req() req: Request) {
    const userId = Number(req.user?.sub);
    return this.veicoloService.eliminaVeicolo(+id, userId);
  }
}
