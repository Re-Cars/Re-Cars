import {
  avvisoCambioStato,
  giorniA,
  oggiInItalia,
  promemoriaPrenotazione,
  prossimaRevisione,
  scadenzeDaAvvisare,
} from './promemoria';

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe('promemoria', () => {
  it('usa il giorno italiano anche vicino alla mezzanotte UTC', () => {
    // 22:30 UTC del 30 settembre = 00:30 del 1° ottobre in Italia
    expect(oggiInItalia(new Date('2026-09-30T22:30:00Z'))).toBe('2026-10-01');
  });

  it('conta i giorni fra date del calendario', () => {
    expect(giorniA(d('2026-10-05'), '2026-09-28')).toBe(7);
    expect(giorniA(d('2026-09-27'), '2026-09-28')).toBe(-1);
  });

  it('revisione: 4 anni dall’immatricolazione, poi ogni 2', () => {
    expect(prossimaRevisione(d('2023-03-12'), '2026-09-28').toISOString()).toBe(
      '2027-03-12T00:00:00.000Z',
    );
    expect(prossimaRevisione(d('2019-03-12'), '2026-09-28').toISOString()).toBe(
      '2027-03-12T00:00:00.000Z',
    );
  });

  it('avvisa solo a 30, 7, 1 e 0 giorni dalla scadenza', () => {
    const veicolo = (bollo: string) => ({
      id: 3,
      targa: 'AB123CD',
      marca: 'Fiat',
      modello: 'Panda',
      dati_specifici: [
        {
          dataimmatricolazione: null,
          datascadenzabollo: d(bollo),
          datascadenzarca: null,
        },
      ],
    });
    const oggi = '2026-09-28';
    expect(scadenzeDaAvvisare(veicolo('2026-10-05'), oggi)).toEqual([
      expect.objectContaining({
        chiave: 'bollo:3:2026-10-05:7',
        titolo: 'Bollo in scadenza tra 7 giorni',
        testo: 'Fiat Panda (AB123CD): scade il 05/10/2026.',
      }),
    ]);
    expect(scadenzeDaAvvisare(veicolo('2026-09-28'), oggi)[0].titolo).toBe(
      'Bollo in scadenza oggi',
    );
    expect(scadenzeDaAvvisare(veicolo('2026-10-06'), oggi)).toEqual([]);
  });

  const pren = {
    id: 11,
    dataprenotazione: new Date('2026-09-29T09:30:00Z'),
    descrizione: 'Servizio: Tagliando - Note: controllo freni',
    officina: { nome: 'Autofficina Rossi' },
  };

  it('promemoria solo il giorno prima dell’appuntamento', () => {
    expect(promemoriaPrenotazione(pren, '2026-09-28')).toEqual(
      expect.objectContaining({
        chiave: 'prenotazione:11:promemoria',
        testo: 'Alle 09:30 da Autofficina Rossi · Tagliando',
      }),
    );
    expect(promemoriaPrenotazione(pren, '2026-09-27')).toBeNull();
  });

  it('avviso di cambio stato solo per gli stati decisi dall’officina', () => {
    expect(avvisoCambioStato(pren, 'confermata')?.titolo).toBe(
      'Prenotazione confermata',
    );
    expect(avvisoCambioStato(pren, 'in_attesa')).toBeNull();
  });
});
