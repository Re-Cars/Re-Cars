import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma.service';
import {
  GeminiClient,
  GeminiErrore,
  GeminiNonConfigurato,
  GeminiQuotaEsaurita,
} from './gemini.client';
import {
  type AzioneAssistente,
  PAGINE,
  precisaAzioniDichiarate,
  promptDiSistema,
  promptUtente,
  pulisciAzioni,
  SCHEMA_RISPOSTA,
} from './assistente.prompt';
import { LimiteRichieste } from './limite-richieste';
import type { ChatDto } from './dto/chat.dto';
import { testoParziale } from './testo-parziale';

export type EventoAssistente =
  | { type: 'delta'; text: string }
  | {
      type: 'done';
      answer: string;
      actions: AzioneAssistente[];
      used_llm: boolean;
    };

const QUOTA_ESAURITA =
  "In questo momento l'assistente ha raggiunto il limite di richieste del piano gratuito. Riprova tra qualche minuto: nel frattempo trovi le risposte più comuni in Info e domande.";
const NON_DISPONIBILE =
  "L'assistente non è disponibile in questo momento. Riprova più tardi: nel frattempo trovi le risposte più comuni in Info e domande.";

const AZIONE_FAQ: AzioneAssistente = {
  tipo: 'apri_pagina',
  etichetta: 'Vai a Info e domande',
  href: PAGINE.faq.href,
};

const giorniA = (data: Date, oggi: Date) =>
  Math.round((data.getTime() - oggi.getTime()) / 86_400_000);

/** Prossima revisione: 4 anni dall'immatricolazione, poi ogni 2 (come il frontend). */
function prossimaRevisione(imm: Date, oggi: Date): Date {
  const d = new Date(imm);
  d.setFullYear(d.getFullYear() + 4);
  while (d < oggi) d.setFullYear(d.getFullYear() + 2);
  return d;
}

@Injectable()
export class AssistenteService {
  private readonly logger = new Logger('Assistente');
  readonly limite = new LimiteRichieste(
    Number(process.env.ASSISTENTE_LIMITE_MINUTO) || 6,
    Number(process.env.ASSISTENTE_LIMITE_GIORNO) || 50,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiClient,
  ) {}

  /**
   * Dati reali (e minimi) dell'utente per il prompt: veicoli con scadenze,
   * prenotazioni recenti e future, piano. Niente email, telefono o altri
   * dati personali: meno dati escono dal backend, meglio è.
   */
  async contesto(idUtente: number, oggi = new Date()): Promise<string> {
    const [veicoli, prenotazioni, abbonamento] = await Promise.all([
      this.prisma.veicolo.findMany({
        where: { id_utente: idUtente },
        include: { dati_generici: true, dati_specifici: true },
        orderBy: { id: 'asc' },
        take: 30,
      }),
      this.prisma.prenotazione.findMany({
        where: {
          id_utente: idUtente,
          dataprenotazione: { gte: new Date(oggi.getTime() - 30 * 86_400_000) },
        },
        include: { officina: { select: { nome: true, indirizzo: true } } },
        orderBy: { dataprenotazione: 'asc' },
        take: 10,
      }),
      this.prisma.abbonamento.findFirst({
        where: { id_utente: idUtente, stato: 'attivo' },
        orderBy: { data_inizio: 'desc' },
      }),
    ]);

    const data = (d: Date | null | undefined) =>
      d ? d.toLocaleDateString('it-IT') : 'non indicata';
    const scadenza = (d: Date | null | undefined, attivo?: boolean | null) => {
      if (!d) return 'data non disponibile';
      const g = giorniA(d, oggi);
      if (attivo === false || g < 0) return `SCADUTA il ${data(d)}`;
      return `scade il ${data(d)} (tra ${g} giorni)`;
    };

    const righeVeicoli = veicoli.map((v) => {
      const dg = v.dati_generici[0];
      const ds = v.dati_specifici[0];
      const nome = `${v.marca ?? ''} ${v.modello ?? ''}`.trim() || 'Veicolo';
      const revisione = ds?.dataimmatricolazione
        ? scadenza(prossimaRevisione(ds.dataimmatricolazione, oggi))
        : 'data non disponibile';
      return (
        `- ${nome} (${dg?.tipo_veicolo ?? 'tipo n.d.'}, targa ${v.targa ?? 'n.d.'}` +
        `${dg?.alimentazione ? `, ${dg.alimentazione}` : ''}` +
        `${dg?.cilindrata ? `, ${dg.cilindrata} cc` : ''}` +
        `${ds?.dataimmatricolazione ? `, immatricolato nel ${ds.dataimmatricolazione.getFullYear()}` : ''}): ` +
        `bollo ${scadenza(ds?.datascadenzabollo, ds?.isbolloattivo)}; ` +
        `assicurazione${ds?.nomeassicurazione ? ` ${ds.nomeassicurazione}` : ''} ${scadenza(ds?.datascadenzarca, ds?.isinsured)}; ` +
        `revisione ${revisione}`
      );
    });

    const righePrenotazioni = prenotazioni.map((p) => {
      const servizio = (p.descrizione ?? '')
        .replace(/^Servizio:\s*/, '')
        .replace(/\s*-\s*Note:.*$/s, '');
      return `- ${p.dataprenotazione.toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })} presso ${p.officina?.nome ?? 'officina'}: ${servizio || 'servizio n.d.'} (stato: ${p.stato})`;
    });

    return [
      `Piano: ${abbonamento?.piano ?? 'base'}`,
      `Veicoli nel garage (${veicoli.length}):`,
      ...(righeVeicoli.length ? righeVeicoli : ['- nessun veicolo']),
      'Prenotazioni recenti e future:',
      ...(righePrenotazioni.length ? righePrenotazioni : ['- nessuna']),
    ].join('\n');
  }

  /** Risposta a pezzi: `delta` mentre il modello scrive, `done` con testo finale e azioni. */
  async *rispondi(
    idUtente: number,
    dto: ChatDto,
    segnale?: AbortSignal,
  ): AsyncGenerator<EventoAssistente> {
    const domanda = dto.messaggio.trim();
    let grezzo = '';
    let emesso = '';
    try {
      const sistema = promptDiSistema(
        await this.contesto(idUtente),
        new Date(),
      );
      const prompt = promptUtente(domanda, dto.storico ?? [], dto.pagina);
      for await (const pezzo of this.gemini.stream(
        {
          sistema,
          prompt,
          schema: SCHEMA_RISPOSTA,
          maxToken: 2048,
          timeoutMs: 45_000,
          scopo: 'assistente',
        },
        segnale,
      )) {
        grezzo += pezzo;
        const parziale = testoParziale(grezzo, 'risposta');
        if (parziale.length > emesso.length && parziale.startsWith(emesso)) {
          yield { type: 'delta', text: parziale.slice(emesso.length) };
          emesso = parziale;
        }
      }
    } catch (err) {
      if (segnale?.aborted) return;
      const quota = err instanceof GeminiQuotaEsaurita;
      if (
        !(err instanceof GeminiNonConfigurato) &&
        !(err instanceof GeminiErrore)
      ) {
        this.logger.error(
          "Errore imprevisto dell'assistente",
          err instanceof Error ? err.stack : err,
        );
      } else {
        this.logger.warn(`Assistente non disponibile: ${err.message}`);
      }
      yield {
        type: 'done',
        answer: quota ? QUOTA_ESAURITA : NON_DISPONIBILE,
        actions: [AZIONE_FAQ],
        used_llm: false,
      };
      return;
    }

    let risposta: { risposta?: string; azioni?: unknown } = {};
    try {
      risposta = JSON.parse(grezzo) as typeof risposta;
    } catch {
      // JSON troncato: vale il testo già arrivato
      risposta = { risposta: testoParziale(grezzo, 'risposta') };
    }
    const testo = (risposta.risposta ?? '').trim();
    if (!testo) {
      yield {
        type: 'done',
        answer:
          'Non sono riuscito a formulare una risposta. Riprova a chiedermelo.',
        actions: [],
        used_llm: false,
      };
      return;
    }
    yield {
      type: 'done',
      answer: precisaAzioniDichiarate(testo),
      actions: pulisciAzioni(risposta.azioni),
      used_llm: true,
    };
  }
}
