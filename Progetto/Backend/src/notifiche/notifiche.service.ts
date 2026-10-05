import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma.service';
import { IscrizioneDto } from './dto/iscrizione.dto';
import { INTERVENTI_SCADENZA } from '../veicolo/scadenze';
import {
  avvisoCambioStato,
  avvisoFineAbbonamento,
  oggiInItalia,
  promemoriaPrenotazione,
  scadenzeDaAvvisare,
  type Notifica,
  type NotificaProgrammata,
} from './promemoria';

/**
 * Notifiche push (Web Push con chiavi VAPID) verso i dispositivi su cui
 * l'utente le ha attivate. Senza VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY il
 * modulo resta spento: gli endpoint rispondono ma non parte nulla.
 */
@Injectable()
export class NotificheService {
  private readonly logger = new Logger('Notifiche');
  readonly chiavePubblica: string | null;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    // spazi e virgolette copiati per errore nel .env / su Render
    const pulisci = (v: string | undefined) =>
      v?.trim().replace(/^["']|["']$/g, '') || undefined;
    const pubblica = pulisci(config.get<string>('VAPID_PUBLIC_KEY'));
    const privata = pulisci(config.get<string>('VAPID_PRIVATE_KEY'));
    let soggetto =
      pulisci(config.get<string>('VAPID_SUBJECT')) ??
      'mailto:noreply@recars.it';
    // web-push vuole "mailto:indirizzo" o un URL https: un'email nuda si accetta
    if (/^[^\s@:]+@[^\s@]+$/.test(soggetto)) soggetto = `mailto:${soggetto}`;

    let attiva: string | null = null;
    if (pubblica && privata) {
      try {
        webpush.setVapidDetails(soggetto, pubblica, privata);
        attiva = pubblica;
      } catch (err) {
        // chiavi sbagliate non devono far cadere tutto il backend
        this.logger.error(
          `Notifiche push disattivate, chiavi VAPID non valide: ${(err as Error).message}. ` +
            'Rigenerale con "npx web-push generate-vapid-keys" (non con openssl).',
        );
      }
    }
    this.chiavePubblica = attiva;
  }

  get attive(): boolean {
    return this.chiavePubblica !== null;
  }

  /** Stesso endpoint = stesso browser: se cambia utente passa al nuovo. */
  async iscrivi(idUtente: number, dto: IscrizioneDto) {
    await this.prisma.push_iscrizione.upsert({
      where: { endpoint: dto.endpoint },
      create: {
        id_utente: idUtente,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
      },
      update: {
        id_utente: idUtente,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
      },
    });
  }

  async disiscrivi(idUtente: number, endpoint: string) {
    await this.prisma.push_iscrizione.deleteMany({
      where: { id_utente: idUtente, endpoint },
    });
  }

  /** Manda a tutti i dispositivi dell'utente; ritorna quante sono partite. */
  async inviaAUtente(idUtente: number, notifica: Notifica): Promise<number> {
    if (!this.attive) return 0;
    const iscrizioni = await this.prisma.push_iscrizione.findMany({
      where: { id_utente: idUtente },
    });
    let inviate = 0;
    for (const i of iscrizioni) {
      try {
        await webpush.sendNotification(
          { endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } },
          JSON.stringify(notifica),
          { TTL: 24 * 3600 },
        );
        inviate++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        // 404/410: il browser ha revocato l'iscrizione, non serve più
        if (status === 404 || status === 410) {
          await this.prisma.push_iscrizione.delete({ where: { id: i.id } });
        } else {
          this.logger.warn(
            `Invio fallito all'utente ${idUtente}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      }
    }
    return inviate;
  }

  /** Invio senza doppioni: una chiave già registrata non riparte. */
  private async inviaUnaVolta(
    idUtente: number,
    notifica: NotificaProgrammata,
  ): Promise<boolean> {
    const gia = await this.prisma.notifica_inviata.findUnique({
      where: {
        id_utente_chiave: { id_utente: idUtente, chiave: notifica.chiave },
      },
    });
    if (gia) return false;
    const { chiave, ...contenuto } = notifica;
    if ((await this.inviaAUtente(idUtente, contenuto)) === 0) return false;
    try {
      await this.prisma.notifica_inviata.create({
        data: { id_utente: idUtente, chiave },
      });
    } catch (err) {
      // due controlli in parallelo: l'altro l'ha già registrata
      if (
        !(err instanceof Prisma.PrismaClientKnownRequestError) ||
        err.code !== 'P2002'
      ) {
        throw err;
      }
    }
    return true;
  }

  /**
   * Da chiamare una volta al giorno (POST /notifiche/controllo-giornaliero):
   * scadenze a 30, 7, 1 e 0 giorni e promemoria degli appuntamenti di
   * domani, solo per gli utenti con almeno un dispositivo iscritto.
   */
  async controlloGiornaliero(adesso = new Date()) {
    const risultato = { utenti: 0, scadenze: 0, promemoria: 0, abbonamenti: 0 };
    const oggi = oggiInItalia(adesso);
    // abbonamenti con rinnovo spento arrivati a fine periodo: si torna a
    // Gratis anche se il webhook di Stripe non è arrivato (va fatto anche
    // con le notifiche spente)
    risultato.abbonamenti = (
      await this.prisma.abbonamento.updateMany({
        where: {
          stato: 'attivo',
          data_fine: { lt: new Date(`${oggi}T00:00:00Z`) },
        },
        data: { stato: 'scaduto' },
      })
    ).count;
    if (!this.attive) return risultato;
    const utenti = await this.prisma.push_iscrizione.findMany({
      distinct: ['id_utente'],
      select: { id_utente: true },
    });
    risultato.utenti = utenti.length;

    for (const { id_utente } of utenti) {
      const veicoli = await this.prisma.veicolo.findMany({
        where: { id_utente },
        include: {
          dati_specifici: true,
          storico_intervento: {
            where: { tipo: { in: Object.keys(INTERVENTI_SCADENZA) } },
            select: { tipo: true, data: true },
          },
        },
      });
      for (const v of veicoli) {
        for (const avviso of scadenzeDaAvvisare(v, oggi)) {
          if (await this.inviaUnaVolta(id_utente, avviso)) risultato.scadenze++;
        }
      }

      const abbonamento = await this.prisma.abbonamento.findFirst({
        where: { id_utente, stato: 'attivo', data_fine: { not: null } },
        select: { id: true, data_fine: true },
      });
      const fine = abbonamento && avvisoFineAbbonamento(abbonamento, oggi);
      if (fine && (await this.inviaUnaVolta(id_utente, fine))) {
        risultato.scadenze++;
      }

      const prenotazioni = await this.prisma.prenotazione.findMany({
        where: {
          id_utente,
          stato: { in: ['in_attesa', 'confermata'] },
          dataprenotazione: { gte: new Date(`${oggi}T00:00:00Z`) },
        },
        include: { officina: { select: { nome: true } } },
      });
      for (const p of prenotazioni) {
        const avviso = promemoriaPrenotazione(p, oggi);
        if (avviso && (await this.inviaUnaVolta(id_utente, avviso))) {
          risultato.promemoria++;
        }
      }
    }
    this.logger.log(
      `Controllo giornaliero ${oggi}: ${risultato.scadenze} scadenze, ${risultato.promemoria} promemoria`,
    );
    return risultato;
  }

  /** Avviso sull'abbonamento dal webhook di Stripe (mai bloccante, senza doppioni). */
  async avvisaAbbonamento(idUtente: number, notifica: NotificaProgrammata) {
    if (!this.attive) return;
    try {
      await this.inviaUnaVolta(idUtente, notifica);
    } catch (err) {
      this.logger.warn(
        `Avviso abbonamento non inviato: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /** Chiamata dall'officina quando conferma, annulla o completa. */
  async avvisaCambioStato(idPrenotazione: number, stato: string) {
    if (!this.attive) return;
    try {
      const p = await this.prisma.prenotazione.findUnique({
        where: { id: idPrenotazione },
        include: { officina: { select: { nome: true } } },
      });
      const notifica = p && avvisoCambioStato(p, stato);
      if (p && notifica) await this.inviaAUtente(p.id_utente, notifica);
    } catch (err) {
      // la notifica non deve mai far fallire il cambio di stato
      this.logger.warn(
        `Avviso cambio stato non inviato: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
