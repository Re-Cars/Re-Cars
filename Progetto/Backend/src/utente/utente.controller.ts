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
  HttpCode,
} from '@nestjs/common';
import { UtenteService } from './utente.service';
import { CreateUtenteDto } from './dto/create-utente.dto';
import { LoginUtenteDto } from './dto/login-utente.dto';
import { UpdateUtenteDto } from './dto/update-utente.dto';
import { LoginAziendaDto } from './dto/login-azienda.dto';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { RichiestaCodiceDto } from '../verifica-email/dto/verifica-email.dto';
import { VerificaEmailService } from '../verifica-email/verifica-email.service';
import { authCookieOptions, SESSIONE_MS } from '../auth-cookie.util';
import type { Request, Response } from 'express';

@Controller('auth')
export class UtenteController {
  constructor(
    private readonly utenteService: UtenteService,
    private readonly verificaEmail: VerificaEmailService,
  ) {}

  /**
   * Primo passo della registrazione (utenti e officine): controlla che
   * l'indirizzo sia plausibile e libero e ci manda un codice di 6 cifre.
   */
  @Post('verifica-email')
  @HttpCode(200)
  richiediCodice(@Body() dto: RichiestaCodiceDto) {
    return this.verificaEmail.inviaCodice(dto.email, dto.per);
  }

  @Post('register')
  async register(
    @Body() datiRicevuti: CreateUtenteDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.verificaEmail.verifica(datiRicevuti.email, datiRicevuti.codice);
    const { access_token, utente } =
      await this.utenteService.registra(datiRicevuti);
    response.cookie(
      'access_token',
      access_token,
      authCookieOptions(SESSIONE_MS),
    );
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
    response.cookie(
      'access_token',
      access_token,
      authCookieOptions(SESSIONE_MS),
    );

    return { utente };
  }

  @Post('login/azienda')
  async loginAzienda(
    @Body() datiRicevuti: LoginAziendaDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { access_token, utente } =
      await this.utenteService.loginAzienda(datiRicevuti);
    response.cookie(
      'access_token',
      access_token,
      authCookieOptions(SESSIONE_MS),
    );
    return { utente };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('access_token', authCookieOptions());
    return { message: 'Logout effettuato con successo' };
  }

  /** Chi sono: profilo utente o officina della sessione corrente. */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request) {
    return this.utenteService.profiloSessione(
      Number(req.user?.sub),
      req.user?.tipo,
    );
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
