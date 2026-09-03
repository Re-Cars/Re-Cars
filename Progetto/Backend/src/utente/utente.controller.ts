import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Param,
  UseGuards,
  ForbiddenException,
  Req,
  Res,
} from '@nestjs/common';
import { UtenteService } from './utente.service';
import { CreateUtenteDto } from './dto/create-utente.dto';
import { LoginUtenteDto } from './dto/login-utente.dto';
import { UpdateUtenteDto } from './dto/update-utente.dto';
import { LoginAziendaDto } from './dto/login-azienda.dto';
import { JwtAuthGuard } from '../jwt-auth.guard';
import type { Request, Response } from 'express';

@Controller('auth')
export class UtenteController {
  constructor(private readonly utenteService: UtenteService) {}

  @Post('register')
  async register(
    @Body() datiRicevuti: CreateUtenteDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { access_token, utente } =
      await this.utenteService.registra(datiRicevuti);
    response.cookie('access_token', access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 3600000,
    });
    return { utente };
  }

  @Post('login')
  async login(
    @Body() datiRicevuti: LoginUtenteDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { access_token, utente } =
      await this.utenteService.login(datiRicevuti);

    // Impostiamo il cookie HttpOnly nel browser
    response.cookie('access_token', access_token, {
      httpOnly: true,
      secure: true, // true solo in HTTPS (produzione)
      sameSite: 'none',
      maxAge: 3600000,
    });

    return { utente };
  }

  @Post('login/azienda')
  async loginAzienda(
    @Body() datiRicevuti: LoginAziendaDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { access_token, utente } =
      await this.utenteService.loginAzienda(datiRicevuti);
    response.cookie('access_token', access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 3600000,
    });
    return { utente };
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
  @Get('utente/:id')
  async getUtentebyID(@Param('id') id: string, @Req() req: Request) {
    const loggedUserId = Number(req.user?.sub);
    if (loggedUserId !== +id) {
      throw new ForbiddenException(
        'Non autorizzato ad accedere a questo profilo',
      );
    }
    return this.utenteService.getUtentebyID(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('utente/:id')
  async aggiornaUtente(
    @Param('id') id: string,
    @Body() datiRicevuti: UpdateUtenteDto,
    @Req() req: Request,
  ) {
    const loggedUserId = Number(req.user?.sub);
    if (loggedUserId !== +id) {
      throw new ForbiddenException(
        'Non autorizzato a modificare questo profilo',
      );
    }
    return this.utenteService.aggiornaUtente(+id, datiRicevuti);
  }
}
