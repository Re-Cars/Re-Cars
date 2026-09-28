import { testoParziale } from './testo-parziale';

describe('testoParziale', () => {
  it('estrae il valore anche se il JSON non è finito', () => {
    expect(testoParziale('{"risposta": "Il bollo sc', 'risposta')).toBe(
      'Il bollo sc',
    );
  });

  it('si ferma alle virgolette di chiusura', () => {
    expect(
      testoParziale('{"risposta": "Fatto.", "azioni": []}', 'risposta'),
    ).toBe('Fatto.');
  });

  it('decodifica gli escape completi e aspetta quelli spezzati', () => {
    expect(testoParziale('{"risposta": "riga\\nnuova', 'risposta')).toBe(
      'riga\nnuova',
    );
    expect(testoParziale('{"risposta": "perch\\u00e9', 'risposta')).toBe(
      'perché',
    );
    expect(testoParziale('{"risposta": "perch\\u00', 'risposta')).toBe('perch');
    expect(testoParziale('{"risposta": "a\\', 'risposta')).toBe('a');
  });

  it('restituisce stringa vuota se la chiave non è ancora arrivata', () => {
    expect(testoParziale('{"ris', 'risposta')).toBe('');
    expect(testoParziale('{"risposta"', 'risposta')).toBe('');
  });
});
