import { ConfigService } from '@nestjs/config';
import { CarburantiService } from './carburanti.service';
import { carburanteDa, distanzaKm, leggiCsv, unisciDati } from './mimit';

// stesso formato dei CSV pubblicati dal MIMIT (anagrafica e prezzi alle 8)
const ANAGRAFICA = `Estrazione del 2026-09-28
idImpianto|Gestore|Bandiera|Tipo Impianto|Nome Impianto|Indirizzo|Comune|Provincia|Latitudine|Longitudine
101|ROSSI SRL|IP|Stradale|IP Fardella|VIA FARDELLA 210|TRAPANI|TP|38.0180|12.5190
102|BIANCHI SNC|Q8|Stradale|Q8 Marsala|VIA MARSALA 88|TRAPANI|TP|38.0105|12.5300
103|VERDI SAS|Agip Eni|Stradale|Eni Virgilio|VIA VIRGILIO 12|TRAPANI|TP|38.0300|12.5400
104|LONTANO SPA|Esso|Autostradale|Esso A29|A29 KM 3|ALCAMO|TP|37.9800|12.9600
105|SENZA COORDINATE|Tamoil|Stradale|Tamoil|VIA X|TRAPANI|TP||
`;
const PREZZI = `Estrazione del 2026-09-28
idImpianto|descCarburante|prezzo|isSelf|dtComu
101|Benzina|1.759|1|28/09/2026 07:12:00
101|Benzina|1.899|0|28/09/2026 07:12:00
101|Gasolio|1.689|1|28/09/2026 07:12:00
102|Benzina|1.772|1|27/09/2026 19:40:00
102|HiQ Perform+|1.999|1|27/09/2026 19:40:00
103|Benzina|1.899|0|28/09/2026 06:00:00
103|GPL|0.719|0|28/09/2026 06:00:00
104|Benzina|1.699|1|28/09/2026 06:00:00
105|Benzina|1.500|1|28/09/2026 06:00:00
`;

describe('open data MIMIT', () => {
  it('legge estrazione, intestazione e separatore', () => {
    const t = leggiCsv(ANAGRAFICA);
    expect(t.estrazione).toBe('2026-09-28');
    expect(t.righe[0]).toMatchObject({ idimpianto: '101', bandiera: 'IP' });
    // vecchio formato con ";"
    expect(leggiCsv('idImpianto;Bandiera\n7;Esso').righe[0].bandiera).toBe(
      'Esso',
    );
  });

  it('riconosce solo i carburanti base', () => {
    expect(carburanteDa('Gasolio')).toBe('gasolio');
    expect(carburanteDa('Blue Diesel')).toBeNull();
  });

  it('unisce anagrafica e prezzi, scarta impianti senza coordinate', () => {
    const { impianti, estrazione } = unisciDati(ANAGRAFICA, PREZZI);
    expect(estrazione).toBe('2026-09-28');
    expect(impianti.map((i) => i.id)).toEqual([101, 102, 103, 104]);
    expect(impianti[0].prezzi.benzina).toMatchObject({
      self: 1.759,
      servito: 1.899,
    });
    expect(impianti[1].prezzi).not.toHaveProperty('hiq');
  });

  it('calcola le distanze', () => {
    expect(distanzaKm(38.0176, 12.5365, 38.018, 12.519)).toBeCloseTo(1.5, 1);
  });
});

describe('CarburantiService.vicini', () => {
  const config = { get: () => undefined } as unknown as ConfigService;
  const fetchOriginale = global.fetch;
  afterEach(() => {
    global.fetch = fetchOriginale;
  });

  it('ordina per prezzo entro il raggio, preferendo il self', async () => {
    global.fetch = jest.fn((url: string) =>
      Promise.resolve(
        new Response(url.includes('anagrafica') ? ANAGRAFICA : PREZZI),
      ),
    );
    const s = new CarburantiService(config);
    const r = await s.vicini(38.0176, 12.5365, 'benzina', 5);
    expect(r.estrazione).toBe('2026-09-28');
    // l'Esso di Alcamo è più economica ma a 38 km: fuori raggio
    expect(r.impianti.map((i) => [i.id, i.prezzo, i.self])).toEqual([
      [101, 1.759, true],
      [102, 1.772, true],
      [103, 1.899, false],
    ]);
  });

  it('503 se i dati non si scaricano e non ce ne sono di vecchi', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve(new Response('', { status: 500 })),
    );
    const s = new CarburantiService(config);
    await expect(s.vicini(38, 12.5, 'benzina')).rejects.toThrow(
      /non disponibili/,
    );
  });
});
