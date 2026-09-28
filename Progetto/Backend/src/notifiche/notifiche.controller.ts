import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';
import { CurrentUser } from '../current-user.decorator';
import { JwtAuthGuard } from '../jwt-auth.guard';
import type { JwtPayload } from '../jwt-payload.interface';
import { DisiscrizioneDto, IscrizioneDto } from './dto/iscrizione.dto';
import { NotificheService } from './notifiche.service';

function soloUtente(user: JwtPayload): number {
  if (user.tipo === 'officina') {
    throw new ForbiddenException('Notifiche disponibili solo per gli utenti');
  }
  return Number(user.sub);
}

/** Confronto a tempo costante (gli hash hanno sempre la stessa lunghezza). */
const uguali = (a: string, b: string) =>
  timingSafeEqual(
    createHash('sha256').update(a).digest(),
    createHash('sha256').update(b).digest(),
  );

@Controller('notifiche')
export class NotificheController {
  constructor(
    private readonly notifiche: NotificheService,
    private readonly config: ConfigService,
  ) {}

  /** Chiave VAPID pubblica per PushManager.subscribe nel browser. */
  @Get('chiave-pubblica')
  chiavePubblica() {
    if (!this.notifiche.chiavePubblica) {
      throw new ServiceUnavailableException('Notifiche non configurate');
    }
    return { chiave: this.notifiche.chiavePubblica };
  }

  @UseGuards(JwtAuthGuard)
  @Post('iscrizione')
  @HttpCode(204)
  async iscrivi(@Body() dto: IscrizioneDto, @CurrentUser() user: JwtPayload) {
    await this.notifiche.iscrivi(soloUtente(user), dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('iscrizione')
  @HttpCode(204)
  async disiscrivi(
    @Body() dto: DisiscrizioneDto,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.notifiche.disiscrivi(soloUtente(user), dto.endpoint);
  }

  /** Notifica di prova ai dispositivi dell'utente. */
  @UseGuards(JwtAuthGuard)
  @Post('prova')
  async prova(@CurrentUser() user: JwtPayload) {
    const inviate = await this.notifiche.inviaAUtente(soloUtente(user), {
      titolo: 'Notifiche attive',
      testo: 'Ti avviseremo qui di scadenze e appuntamenti.',
      url: '/account',
      tag: 'prova',
    });
    return { inviate };
  }

  /**
   * Scadenze e promemoria del giorno. Lo chiama un job pianificato (vedi
   * .github/workflows/notifiche-giornaliere.yml) con l'header
   * x-cron-secret uguale a NOTIFICHE_CRON_SECRET.
   */
  @Post('controllo-giornaliero')
  @HttpCode(200)
  async controlloGiornaliero(@Headers('x-cron-secret') segreto?: string) {
    const atteso = this.config.get<string>('NOTIFICHE_CRON_SECRET');
    if (!atteso) {
      throw new ServiceUnavailableException('NOTIFICHE_CRON_SECRET mancante');
    }
    if (!segreto || !uguali(segreto, atteso)) {
      throw new UnauthorizedException();
    }
    return this.notifiche.controlloGiornaliero();
  }
}
