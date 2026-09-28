import { Injectable, Logger } from '@nestjs/common';

/**
 * Client REST di Google Gemini (piano gratuito), senza SDK: una fetch verso
 * l'API pubblica. Stesso schema del progetto Kilo (llm_client.py):
 *  - la chiave va nell'header `x-goog-api-key`, mai nell'URL (gli URL
 *    finiscono nei log, gli header no);
 *  - risposta JSON vincolata da uno schema (responseSchema);
 *  - nuovi tentativi solo sugli errori temporanei (5xx/rete), mai sul 429:
 *    sul piano gratuito vuol dire quota esaurita e riprovare subito non serve;
 *  - se il modello fissato viene ritirato (404) si ripiega sull'alias
 *    "latest" della stessa famiglia.
 */

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const STATI_TEMPORANEI = new Set([500, 502, 503, 504]);
const ATTESE_RIPROVA_MS = [1000, 3000];

export class GeminiNonConfigurato extends Error {}
export class GeminiErrore extends Error {}
export class GeminiQuotaEsaurita extends GeminiErrore {}

export interface RichiestaGemini {
  sistema: string;
  prompt: string;
  schema: Record<string, unknown>;
  temperatura?: number;
  maxToken?: number;
  timeoutMs?: number;
  scopo?: string;
}

/** Alias "latest" della stessa famiglia, usato se il modello fissato non esiste più. */
export function modelloDiRipiego(modello: string): string {
  return modello.includes('lite')
    ? 'gemini-flash-lite-latest'
    : 'gemini-flash-latest';
}

@Injectable()
export class GeminiClient {
  private readonly logger = new Logger('Gemini');

  get configurato(): boolean {
    return Boolean(process.env.GEMINI_API_KEY);
  }

  private get modello(): string {
    return process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
  }

  private corpo(r: RichiestaGemini) {
    return {
      systemInstruction: { parts: [{ text: r.sistema }] },
      contents: [{ role: 'user', parts: [{ text: r.prompt }] }],
      generationConfig: {
        temperature: r.temperatura ?? 0.3,
        responseMimeType: 'application/json',
        responseSchema: r.schema,
        ...(r.maxToken ? { maxOutputTokens: r.maxToken } : {}),
      },
    };
  }

  /** POST con nuovi tentativi sugli errori temporanei finché resta tempo. */
  private async invia(
    modello: string,
    corpo: unknown,
    scadenza: number,
    segnale?: AbortSignal,
  ): Promise<Response> {
    let motivo = '';
    for (
      let tentativo = 0;
      tentativo <= ATTESE_RIPROVA_MS.length;
      tentativo++
    ) {
      const rimasto = scadenza - Date.now();
      if (rimasto <= 0)
        throw new GeminiErrore('Tempo massimo per la risposta esaurito');
      try {
        const segnali = [
          AbortSignal.timeout(rimasto),
          ...(segnale ? [segnale] : []),
        ];
        const risposta = await fetch(
          `${GEMINI_URL}/${encodeURIComponent(modello)}:streamGenerateContent?alt=sse`,
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-goog-api-key': process.env.GEMINI_API_KEY ?? '',
            },
            body: JSON.stringify(corpo),
            signal: AbortSignal.any(segnali),
          },
        );
        if (!STATI_TEMPORANEI.has(risposta.status)) return risposta;
        motivo = `HTTP ${risposta.status}`;
        await risposta.body?.cancel();
      } catch (err) {
        if (segnale?.aborted) throw err;
        motivo = err instanceof Error ? err.name : String(err);
      }
      const attesa = ATTESE_RIPROVA_MS[tentativo];
      if (attesa === undefined || scadenza - Date.now() < attesa + 2000) break;
      this.logger.log(
        `${modello}: ${motivo}, nuovo tentativo fra ${attesa} ms`,
      );
      await new Promise((r) => setTimeout(r, attesa));
    }
    throw new GeminiErrore(`Gemini non raggiungibile (${motivo})`);
  }

  /**
   * Risposta in streaming: restituisce i frammenti di testo grezzo (il JSON
   * della risposta, un pezzo alla volta) man mano che arrivano.
   */
  async *stream(
    r: RichiestaGemini,
    segnale?: AbortSignal,
  ): AsyncGenerator<string> {
    if (!this.configurato)
      throw new GeminiNonConfigurato('GEMINI_API_KEY non configurata');
    const corpo = this.corpo(r);
    const scadenza = Date.now() + (r.timeoutMs ?? 60_000);
    let modello = this.modello;

    let risposta = await this.invia(modello, corpo, scadenza, segnale);
    if (risposta.status === 404 && modello !== modelloDiRipiego(modello)) {
      this.logger.warn(
        `Modello ${modello} non disponibile: uso ${modelloDiRipiego(modello)}`,
      );
      await risposta.body?.cancel();
      modello = modelloDiRipiego(modello);
      risposta = await this.invia(modello, corpo, scadenza, segnale);
    }
    if (risposta.status === 429) {
      await risposta.body?.cancel();
      this.logger.warn(
        `Quota Gemini esaurita (${modello}, ${r.scopo ?? 'generico'})`,
      );
      throw new GeminiQuotaEsaurita('Limite di richieste Gemini raggiunto');
    }
    if (!risposta.ok || !risposta.body) {
      await risposta.body?.cancel();
      throw new GeminiErrore(`HTTP ${risposta.status}`);
    }

    const lettore = risposta.body
      .pipeThrough(new TextDecoderStream())
      .getReader();
    let buffer = '';
    for (;;) {
      const { value, done } = await lettore.read();
      if (done) break;
      buffer += value;
      let fine: number;
      while ((fine = buffer.indexOf('\n')) >= 0) {
        const riga = buffer.slice(0, fine).trim();
        buffer = buffer.slice(fine + 1);
        const testo = this.testoDaRiga(riga, modello, r.scopo);
        if (testo) yield testo;
      }
    }
    const testo = this.testoDaRiga(buffer.trim(), modello, r.scopo);
    if (testo) yield testo;
  }

  private testoDaRiga(riga: string, modello: string, scopo?: string): string {
    if (!riga.startsWith('data:')) return '';
    const dati = riga.slice(5).trim();
    if (!dati || dati === '[DONE]') return '';
    let blocco: {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: Record<string, number>;
    };
    try {
      blocco = JSON.parse(dati) as typeof blocco;
    } catch {
      return '';
    }
    if (blocco.usageMetadata) {
      // token reali consumati: così la quota si controlla sui numeri, non a stima
      const u = blocco.usageMetadata;
      this.logger.log(
        `[${scopo ?? 'generico'}] ${modello}: ${u.promptTokenCount ?? '?'} token in ingresso, ${u.candidatesTokenCount ?? 0} in uscita`,
      );
    }
    return (blocco.candidates ?? [])
      .flatMap((c) => c.content?.parts ?? [])
      .map((p) => p.text ?? '')
      .join('');
  }
}
