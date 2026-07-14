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
  Req,
} from '@nestjs/common';
import { OfficinaService } from './officina.service';
import { CreateOfficinaDto } from './dto/create-officina.dto';
import { LoginOfficinaDto } from './dto/login-officina.dto';
import { JwtAuthGuard } from '../jwt-auth.guard';
import type { Request, Response } from 'express';

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
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('access_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
    return { message: 'Logout effettuato con successo' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard')
  async dashboard(@Req() req: Request) {
    const officinaId = Number((req.user as any).sub);
    return this.officinaService.dashboard(officinaId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('prenotazioni')
  async prenotazioni(@Req() req: Request, @Query('stato') stato?: string) {
    const officinaId = Number((req.user as any).sub);
    return this.officinaService.tutteLePrenotazioni(officinaId, stato);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('prenotazioni/:id/stato')
  async aggiornaStato(
    @Param('id') id: string,
    @Body('stato') stato: string,
    @Req() req: Request,
  ) {
    const officinaId = Number((req.user as any).sub);
    return this.officinaService.aggiornaStatoPrenotazione(
      +id,
      stato,
      officinaId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('profilo')
  async profilo(@Req() req: Request) {
    const officinaId = Number((req.user as any).sub);
    return this.officinaService.statistiche(officinaId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profilo')
  async aggiornaProfilo(@Body() body: any, @Req() req: Request) {
    const officinaId = Number((req.user as any).sub);
    return this.officinaService.aggiornaProfilo(officinaId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('abbonamento')
  async cambiaAbbonamento(@Body('piano') piano: string, @Req() req: Request) {
    const officinaId = Number((req.user as any).sub);
    return this.officinaService.cambiaAbbonamento(officinaId, piano);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('abbonamento')
  async disdiciAbbonamento(@Req() req: Request) {
    const officinaId = Number((req.user as any).sub);
    return this.officinaService.disdiciAbbonamento(officinaId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('profilo')
  async eliminaProfilo(
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const officinaId = Number((req.user as any).sub);
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
    @Req() req: Request,
    @Query('anno') anno: string,
    @Query('mese') mese: string,
  ) {
    const officinaId = Number((req.user as any).sub);
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
