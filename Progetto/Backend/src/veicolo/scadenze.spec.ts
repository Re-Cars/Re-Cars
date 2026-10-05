import { calcolaScadenze, scadenzeJson } from './scadenze';

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
const oggi = '2026-10-05';
const ds = {
  dataimmatricolazione: d('2005-06-16'),
  datascadenzabollo: d('2026-06-30'),
  datascadenzarca: d('2027-01-10'),
};
const iso = (s: ReturnType<typeof calcolaScadenze>) => scadenzeJson(s);

describe('calcolaScadenze', () => {
  it('senza storico: date salvate, revisione dall’immatricolazione, niente tagliando', () => {
    expect(iso(calcolaScadenze(ds, [], oggi))).toEqual({
      bollo: '2026-06-30',
      assicurazione: '2027-01-10',
      revisione: '2027-06-16',
      tagliando: null,
    });
  });

  it('un bollo pagato sposta la scadenza di un anno', () => {
    const s = calcolaScadenze(
      ds,
      [{ tipo: 'Bollo', data: d('2026-07-02') }],
      oggi,
    );
    expect(iso(s).bollo).toBe('2027-07-02');
  });

  it('vale la data più lontana: un vecchio pagamento non accorcia la scadenza', () => {
    const s = calcolaScadenze(
      ds,
      [{ tipo: 'Assicurazione', data: d('2025-03-01') }],
      oggi,
    );
    expect(iso(s).assicurazione).toBe('2027-01-10');
  });

  it('una revisione registrata vale più del calcolo (+2 anni dall’ultima)', () => {
    const s = calcolaScadenze(
      ds,
      [
        { tipo: 'Revisione', data: d('2022-05-01') },
        { tipo: 'Revisione', data: d('2024-05-03') },
      ],
      oggi,
    );
    expect(iso(s).revisione).toBe('2026-05-03');
  });

  it('tagliando: un anno dall’ultimo, ignora gli altri interventi', () => {
    const s = calcolaScadenze(
      undefined,
      [
        { tipo: 'Tagliando', data: d('2026-02-10') },
        { tipo: 'Cambio olio', data: d('2026-08-01') },
      ],
      oggi,
    );
    expect(iso(s)).toEqual({
      bollo: null,
      assicurazione: null,
      revisione: null,
      tagliando: '2027-02-10',
    });
  });
});
