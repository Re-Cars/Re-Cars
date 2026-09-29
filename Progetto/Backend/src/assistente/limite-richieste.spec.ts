import { LimiteRichieste, LimiteSuperato } from './limite-richieste';

describe('LimiteRichieste', () => {
  const t0 = new Date('2026-09-25T10:00:00.000Z');
  const dopo = (ms: number) => new Date(t0.getTime() + ms);

  it('blocca oltre il limite al minuto e riapre dopo la finestra', () => {
    const limite = new LimiteRichieste(2, 100);
    limite.consuma('u1', t0);
    limite.consuma('u1', dopo(1000));
    expect(() => limite.consuma('u1', dopo(2000))).toThrow(LimiteSuperato);
    expect(() => limite.consuma('u1', dopo(61_000))).not.toThrow();
  });

  it('conta separatamente ogni utente', () => {
    const limite = new LimiteRichieste(1, 100);
    limite.consuma('u1', t0);
    expect(() => limite.consuma('u2', t0)).not.toThrow();
  });

  it('applica il tetto giornaliero e lo azzera il giorno dopo', () => {
    const limite = new LimiteRichieste(100, 2);
    limite.consuma('u1', t0);
    limite.consuma('u1', dopo(1000));
    let errore: unknown;
    try {
      limite.consuma('u1', dopo(2000));
    } catch (e) {
      errore = e;
    }
    expect(errore).toBeInstanceOf(LimiteSuperato);
    expect((errore as LimiteSuperato).riprovaTraSecondi).toBeGreaterThan(0);
    expect(() =>
      limite.consuma('u1', new Date('2026-09-26T08:00:00.000Z')),
    ).not.toThrow();
  });

  it('il tetto giornaliero può dipendere dal piano', () => {
    const limite = new LimiteRichieste(100, 50);
    limite.consuma('gratis', t0, 1);
    expect(() => limite.consuma('gratis', dopo(1000), 1)).toThrow(
      /1 domande al giorno/,
    );
    limite.consuma('premium', t0, 50);
    expect(() => limite.consuma('premium', dopo(1000), 50)).not.toThrow();
  });
});
