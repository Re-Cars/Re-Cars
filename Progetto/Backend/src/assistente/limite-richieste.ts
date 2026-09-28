/**
 * Limite di richieste per utente, in memoria: una finestra al minuto (contro
 * i clic ripetuti) e un tetto giornaliero (per non consumare da soli la
 * quota gratuita di Gemini, condivisa da tutti gli utenti).
 *
 * In memoria basta finché il backend gira in una sola istanza (Render free);
 * con più istanze andrebbe spostato su uno store condiviso.
 */
export class LimiteSuperato extends Error {
  constructor(
    messaggio: string,
    readonly riprovaTraSecondi: number,
  ) {
    super(messaggio);
  }
}

interface Contatori {
  minuto: number[];
  giorno: string;
  oggi: number;
}

export class LimiteRichieste {
  private readonly perUtente = new Map<string, Contatori>();

  constructor(
    private readonly alMinuto: number,
    private readonly alGiorno: number,
  ) {}

  consuma(utente: string, adesso = new Date()): void {
    const giorno = adesso.toISOString().slice(0, 10);
    const ms = adesso.getTime();
    let c = this.perUtente.get(utente);
    if (!c || c.giorno !== giorno) {
      c = { minuto: [], giorno, oggi: 0 };
      this.perUtente.set(utente, c);
    }
    c.minuto = c.minuto.filter((t) => ms - t < 60_000);

    if (c.oggi >= this.alGiorno) {
      const mezzanotte =
        new Date(`${giorno}T00:00:00.000Z`).getTime() + 86_400_000;
      throw new LimiteSuperato(
        `Hai raggiunto il limite di ${this.alGiorno} domande al giorno all'assistente. Riprova domani.`,
        Math.ceil((mezzanotte - ms) / 1000),
      );
    }
    if (c.minuto.length >= this.alMinuto) {
      throw new LimiteSuperato(
        'Stai facendo troppe domande di fila: aspetta qualche secondo e riprova.',
        Math.ceil((60_000 - (ms - c.minuto[0])) / 1000),
      );
    }
    c.minuto.push(ms);
    c.oggi += 1;
  }
}
