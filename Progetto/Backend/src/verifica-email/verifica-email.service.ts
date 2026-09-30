import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { createHash, randomInt } from 'crypto';
import { promises as dns } from 'dns';

import { PrismaService } from '../prisma.service';
import { motivoEmailNonValida, normalizzaEmail } from './indirizzo';

const VALIDITA_MS = 10 * 60 * 1000;
const ATTESA_REINVIO_MS = 60 * 1000;
const TENTATIVI_MAX = 5;

interface CodiceInSospeso {
  hash: string;
  scadenza: number;
  inviatoIl: number;
  tentativi: number;
}

const impronta = (codice: string) =>
  createHash('sha256').update(codice).digest('hex');

/**
 * Verifica dell'email alla registrazione: un codice di 6 cifre valido 10
 * minuti, mandato all'indirizzo. In memoria (niente tabelle): basta finché
 * il backend gira in una sola istanza, e un riavvio chiede solo un nuovo
 * codice.
 */
@Injectable()
export class VerificaEmailService {
  private readonly logger = new Logger('VerificaEmail');
  private readonly codici = new Map<string, CodiceInSospeso>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  /** Il dominio deve avere un server di posta (record MX). */
  private async dominioRiceveEmail(dominio: string): Promise<boolean> {
    try {
      const mx = await Promise.race([
        dns.resolveMx(dominio),
        new Promise<never>((_, ko) =>
          setTimeout(() => ko(new Error('timeout')), 3000),
        ),
      ]);
      return mx.length > 0;
    } catch (err) {
      const codice = (err as NodeJS.ErrnoException).code;
      // dominio inesistente o senza posta: no. DNS lento o irraggiungibile:
      // non si blocca la registrazione, decide il codice
      return !(codice === 'ENOTFOUND' || codice === 'ENODATA');
    }
  }

  async inviaCodice(
    email: string,
    per: 'utente' | 'officina' = 'utente',
  ): Promise<{ scadeTraMinuti: number }> {
    const e = normalizzaEmail(email);
    const motivo = motivoEmailNonValida(e);
    if (motivo) throw new BadRequestException(motivo);

    const gia =
      per === 'officina'
        ? await this.prisma.officina.findUnique({ where: { email: e } })
        : await this.prisma.utente.findUnique({ where: { email: e } });
    if (gia) throw new ConflictException('Email già registrata: accedi.');

    if (!(await this.dominioRiceveEmail(e.split('@')[1]))) {
      throw new BadRequestException(
        'Questo indirizzo non può ricevere email: controlla di averlo scritto bene.',
      );
    }

    const precedente = this.codici.get(e);
    if (precedente && Date.now() - precedente.inviatoIl < ATTESA_REINVIO_MS) {
      throw new BadRequestException(
        'Ti abbiamo appena mandato un codice: aspetta un minuto prima di chiederne un altro.',
      );
    }

    const codice = String(randomInt(0, 1_000_000)).padStart(6, '0');
    try {
      await this.mailer.sendMail({
        to: e,
        subject: `${codice} è il tuo codice RE|CARS`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#141445">
            <h2 style="margin:0 0 12px">Conferma la tua email</h2>
            <p>Per completare la registrazione a RE|CARS inserisci questo codice:</p>
            <p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:20px 0;color:#f97316">${codice}</p>
            <p style="color:#555">Vale 10 minuti. Se non hai chiesto tu di registrarti, ignora questa email.</p>
          </div>`,
      });
    } catch (err) {
      this.logger.error(
        `Codice non inviato a ${e}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new ServiceUnavailableException(
        "Non riusciamo a mandare l'email di verifica in questo momento: riprova tra poco.",
      );
    }
    this.codici.set(e, {
      hash: impronta(codice),
      scadenza: Date.now() + VALIDITA_MS,
      inviatoIl: Date.now(),
      tentativi: 0,
    });
    return { scadeTraMinuti: VALIDITA_MS / 60_000 };
  }

  /** Lancia BadRequest se il codice non è quello mandato a questa email. */
  verifica(email: string, codice: string | undefined): void {
    const e = normalizzaEmail(email);
    const atteso = this.codici.get(e);
    if (!codice) {
      throw new BadRequestException(
        'Conferma la tua email con il codice che ti abbiamo mandato.',
      );
    }
    if (!atteso || Date.now() > atteso.scadenza) {
      this.codici.delete(e);
      throw new BadRequestException('Il codice è scaduto: chiedine uno nuovo.');
    }
    if (atteso.tentativi >= TENTATIVI_MAX) {
      this.codici.delete(e);
      throw new BadRequestException(
        'Troppi tentativi sbagliati: chiedi un nuovo codice.',
      );
    }
    if (impronta(codice.trim()) !== atteso.hash) {
      atteso.tentativi++;
      throw new BadRequestException('Codice non corretto.');
    }
    this.codici.delete(e);
  }
}
