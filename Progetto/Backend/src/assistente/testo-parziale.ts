/**
 * Valore (anche incompleto) di una chiave stringa dentro un JSON a metà.
 *
 * Serve a mostrare la risposta mentre arriva: il JSON completo non c'è
 * ancora, ma la parte già scritta di `"risposta": "..."` sì. Le sequenze di
 * escape spezzate a metà dal frammento si fermano, altrimenti comparirebbero
 * a schermo come caratteri strani. (Porting di `partial_string` di Kilo.)
 */
export function testoParziale(raw: string, chiave: string): string {
  const ancora = `"${chiave}"`;
  const inizio = raw.indexOf(ancora);
  if (inizio < 0) return '';
  let i = raw.indexOf('"', inizio + ancora.length + 1);
  if (i < 0) return '';
  const fuori: string[] = [];
  i += 1;
  while (i < raw.length) {
    const c = raw[i];
    if (c === '"') break;
    if (c === '\\') {
      const unicode = raw[i + 1] === 'u';
      const lunghezza = unicode ? 6 : 2;
      const sequenza = raw.slice(i, i + lunghezza);
      if (sequenza.length < lunghezza) break; // escape spezzato: si aspetta il resto
      try {
        fuori.push(JSON.parse(`"${sequenza}"`) as string);
      } catch {
        break;
      }
      i += lunghezza;
      continue;
    }
    fuori.push(c);
    i += 1;
  }
  return fuori.join('');
}
