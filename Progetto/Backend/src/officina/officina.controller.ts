import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { OfficinaService } from './officina.service';
import { CreateOfficinaDto } from './dto/create-officina.dto';
import { LoginOfficinaDto } from './dto/login-officina.dto';
import { UpdateOfficinaDto } from './dto/update-officina.dto';
import { JwtAuthGuard } from '../jwt-auth.guard';
import type { Response } from 'express';
import { CurrentUser } from '../current-user.decorator';
import type { JwtPayload } from '../jwt-payload.interface';

@Controller('officina')
export class OfficinaController {
  constructor(private readonly officinaService: OfficinaService) {}

  @Post('register')
  async register(
    @Body() datiRicevuti: CreateOfficinaDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { access_token, officina } =
      await this.officinaService.registra(datiRicevuti);
    response.cookie('access_token', access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 3600000,
    });
    return { officina };
  }

  @Post('login')
  async login(
    @Body() datiRicevuti: LoginOfficinaDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { access_token, officina } =
      await this.officinaService.login(datiRicevuti);
    response.cookie('access_token', access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 3600000,
    });
    return { officina };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('access_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
    return { message: 'Logout effettuato con successo' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard')
  async dashboard(@CurrentUser() user: JwtPayload) {
    const officinaId = Number(user.sub);
    return this.officinaService.dashboard(officinaId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('prenotazioni')
  async prenotazioni(
    @CurrentUser() user: JwtPayload,
    @Query('stato') stato?: string,
  ) {
    const officinaId = Number(user.sub);
    return this.officinaService.tutteLePrenotazioni(officinaId, stato);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('prenotazioni/:id/stato')
  async aggiornaStato(
    @Param('id') id: string,
    @Body('stato') stato: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const officinaId = Number(user.sub);
    return this.officinaService.aggiornaStatoPrenotazione(
      +id,
      stato,
      officinaId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('profilo')
  async profilo(@CurrentUser() user: JwtPayload) {
    const officinaId = Number(user.sub);
    return this.officinaService.statistiche(officinaId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profilo')
  async aggiornaProfilo(
    @Body() body: UpdateOfficinaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const officinaId = Number(user.sub);
    return this.officinaService.aggiornaProfilo(officinaId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('abbonamento')
  async cambiaAbbonamento(
    @Body('piano') piano: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const officinaId = Number(user.sub);
    return this.officinaService.cambiaAbbonamento(officinaId, piano);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('abbonamento')
  async disdiciAbbonamento(@CurrentUser() user: JwtPayload) {
    const officinaId = Number(user.sub);
    return this.officinaService.disdiciAbbonamento(officinaId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('profilo')
  async eliminaProfilo(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) response: Response,
  ) {
    const officinaId = Number(user.sub);
    await this.officinaService.eliminaProfilo(officinaId);
    response.clearCookie('access_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
    return { message: 'Profilo eliminato' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('agenda')
  async agenda(
    @CurrentUser() user: JwtPayload,
    @Query('anno') anno: string,
    @Query('mese') mese: string,
  ) {
    const officinaId = Number(user.sub);
    const now = new Date();
    return this.officinaService.agenda(
      officinaId,
      anno ? Number(anno) : now.getFullYear(),
      mese ? Number(mese) : now.getMonth() + 1,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('all') // Senza un percorso esplicito, l'URL diventa http://localhost:3000/officina
  async findAll() {
    return this.officinaService.findAll();
  }
}
