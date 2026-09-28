/**
 * Lettura dei dati del veicolo dal testo riconosciuto (OCR) su una foto della
 * carta di circolazione / Documento Unico. Funzioni pure, senza dipendenze:
 * l'OCR vero lo fa components/LibrettoOcr con tesseract.js, nel browser.
 *
 * Due strategie, nell'ordine:
 * 1. codici armonizzati UE stampati accanto ai campi (A, B, D.1, D.3, J, P.1,
 *    P.2, P.3): il valore è sulla stessa riga dopo il codice oppure sulla riga
 *    sotto, nella stessa colonna;
 * 2. se un codice non si legge (foto sfocata: le etichette sono piccole), si
 *    riconosce il valore dalla forma: formato targa, data più vecchia, marca
 *    da un elenco noto, alimentazione da un vocabolario.
 *
 * I dati del proprietario (campi C.*) non vengono mai letti né restituiti.
 */

export interface Riquadro {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface ParolaOcr {
  text: string;
  bbox: Riquadro;
}

export interface RigaOcr {
  text: string;
  bbox: Riquadro;
  words: ParolaOcr[];
}

export interface DatiLibretto {
  targa?: string;
  dataimmatricolazione?: string; // AAAA-MM-GG
  marca?: string;
  modello?: string;
  tipo_veicolo?: string;
  alimentazione?: string;
  cilindrata?: number;
  potenza_kw?: number;
}

type Campo = keyof DatiLibretto;

/* ---------------- normalizzazioni ---------------- */

const MAIUSCOLO = (s: string) => s.toUpperCase().replace(/\s+/g, " ").trim();

/** Un valore stampato sul libretto non ha minuscole (le etichette sì); "-" e "/" uniscono le parti. */
const eValore = (parola: string) => !/[a-zàèéìòù]/.test(parola) && (/[A-Z0-9]/.test(parola) || /^[-/]$/.test(parola));

/**
 * Forma di un codice di campo: "A." "B)" "D.1" "P.3)" "C.2.1"… Le lettere da
 * sole hanno sempre il punto o la parentesi (la "A" di "CLASSE A" non è un
 * codice). Chiude la colonna del campo precedente e non è mai un valore.
 */
function eCodice(parola: string): boolean {
  // tra parentesi, come nella vecchia carta di circolazione: "(A)", "(P.1)", "(P1)"
  if (/^\([A-Za-z](?:\.?[0-9Il|](?:\.[0-9Il|])?)?\)?$/.test(parola)) return true;
  // "I", "l", "|" letti al posto di "1" solo dopo il punto: "DI" è la parola "di", non "D.1"
  return /^[A-Z](?:[.)]|\.?[0-9](?:\.[0-9])?[.)]?|\.[Il|](?:\.[0-9Il|])?[.)]?)$/.test(parola);
}

/** Codice di uno dei campi letti ("P.1", "P1)", "D.1." …) → "P.1"; null per gli altri. */
function codice(parola: string): string | null {
  if (!eCodice(parola)) return null;
  const m = parola.replace(/^\(/, "").toUpperCase().match(/^([ABDJP])\.?([0-9Il|]?)/);
  if (!m) return null;
  const numero = m[2].replace(/[Il|]/, "1");
  const c = numero ? `${m[1]}.${numero}` : m[1];
  return ["A", "B", "J", "D.1", "D.3", "P.1", "P.2", "P.3"].includes(c) ? c : null;
}

const CODICE_CAMPO: Record<string, Campo> = {
  A: "targa",
  B: "dataimmatricolazione",
  "D.1": "marca",
  "D.3": "modello",
  J: "tipo_veicolo",
  "P.1": "cilindrata",
  "P.2": "potenza_kw",
  "P.3": "alimentazione",
};

/* ---------------- validatori per campo ---------------- */

// scambi tipici dell'OCR fra lettere e cifre, a seconda della posizione nella targa
const A_LETTERA: Record<string, string> = { "8": "B", "5": "S", "2": "Z", "6": "G" };
const A_CIFRA: Record<string, string> = { O: "0", D: "0", Q: "0", I: "1", L: "1", S: "5", B: "8", Z: "2", G: "6" };

/** Targa auto (AA123BB) o moto (AA12345) con correzione degli scambi tipici dell'OCR. */
export function leggiTarga(testo: string): string | null {
  return leggiTargaConCorrezioni(testo)?.targa ?? null;
}

function leggiTargaConCorrezioni(testo: string): { targa: string; correzioni: number } | null {
  const compatto = testo.toUpperCase().replace(/[^A-Z0-9]/g, "");
  for (const [len, schema] of [
    [7, "LLNNNLL"],
    [7, "LLNNNNN"],
  ] as const) {
    for (let i = 0; i + len <= compatto.length; i++) {
      const pezzo = compatto.slice(i, i + len);
      let correzioni = 0;
      const corretto = [...pezzo]
        .map((ch, k) => {
          const nuovo = schema[k] === "L" ? (A_LETTERA[ch] ?? ch) : (A_CIFRA[ch] ?? ch);
          if (nuovo !== ch) correzioni++;
          return nuovo;
        })
        .join("");
      // al massimo uno scambio: di più vuol dire che non è una targa
      if (correzioni > 1) continue;
      if (schema === "LLNNNLL" ? /^[A-Z]{2}\d{3}[A-Z]{2}$/.test(corretto) : /^[A-Z]{2}\d{5}$/.test(corretto)) {
        return { targa: corretto, correzioni };
      }
    }
  }
  return null;
}

/** Tutte le date gg/mm/aaaa valide (non future) come AAAA-MM-GG. */
export function leggiDate(testo: string): string[] {
  const oggi = new Date().toISOString().slice(0, 10);
  const out: string[] = [];
  for (const m of testo.matchAll(/(\d{1,2})\s?[/.\-]\s?(\d{1,2})\s?[/.\-]\s?((?:19|20)\d{2})/g)) {
    const [g, me, a] = [Number(m[1]), Number(m[2]), m[3]];
    if (g < 1 || g > 31 || me < 1 || me > 12) continue;
    const iso = `${a}-${String(me).padStart(2, "0")}-${String(g).padStart(2, "0")}`;
    if (iso <= oggi) out.push(iso);
  }
  return out;
}

/** Alimentazione (P.3) nel vocabolario del libretto → valore del form. */
export function leggiAlimentazione(testo: string): string | null {
  // "BENZ" di Mercedes-Benz non è benzina
  const t = testo.toUpperCase().replace(/MERCEDES[\s-]*BENZ/g, " ");
  const elettrico = /ELETTR|\bEL\b/.test(t);
  const termico = /BENZ|GASOL|DIESEL/.test(t);
  if (elettrico && termico) return "Ibrida";
  if (/IBRID|HYBRID/.test(t)) return "Ibrida";
  if (/GPL|\bLPG\b/.test(t)) return "GPL";
  if (/METANO|\bMET\b|\bCNG\b/.test(t)) return "Metano";
  if (/GASOLIO|DIESEL/.test(t)) return "Diesel";
  if (/BENZINA|\bBENZ\b/.test(t)) return "Benzina";
  if (elettrico) return "Elettrica";
  return null;
}

/** Categoria J → tipo di veicolo del database. */
export function leggiCategoria(testo: string): string | null {
  const t = testo.toUpperCase().replace(/\s/g, "");
  if (/\bM1|^M1/.test(t) || t.includes("M1")) return "Autovettura";
  if (/L[1-2]E/.test(t)) return "Scooter";
  if (/L[3-5]E/.test(t)) return "Moto";
  if (/L[6-7]E/.test(t)) return "Quad";
  if (/N[1-3]/.test(t)) return "Autocarro";
  if (/M[2-3]/.test(t)) return "Autobus";
  return null;
}

const MARCHE = [
  "ABARTH", "ALFA ROMEO", "APRILIA", "AUDI", "BENELLI", "BMW", "BYD", "CITROEN", "CUPRA", "DACIA", "DAIHATSU",
  "DODGE", "DR", "DS", "DUCATI", "FERRARI", "FIAT", "FORD", "HARLEY-DAVIDSON", "HONDA", "HYUNDAI", "IVECO",
  "JAGUAR", "JEEP", "KAWASAKI", "KIA", "KTM", "KYMCO", "LAMBORGHINI", "LANCIA", "LAND ROVER", "LEXUS", "MASERATI",
  "MAZDA", "MERCEDES-BENZ", "MG", "MINI", "MITSUBISHI", "MOTO GUZZI", "MV AGUSTA", "NISSAN", "OPEL", "PEUGEOT",
  "PIAGGIO", "PORSCHE", "RENAULT", "SEAT", "SKODA", "SMART", "SSANGYONG", "SUBARU", "SUZUKI", "SYM", "TESLA",
  "TOYOTA", "TRIUMPH", "VESPA", "VOLKSWAGEN", "VOLVO", "YAMAHA",
];

/** Marca nota contenuta nel testo, anche con spazi o trattini letti male ("MERCEDES - BENZ"). */
export function leggiMarca(testo: string): string | null {
  const parole = MAIUSCOLO(testo).split(/[\s/]+/);
  const compatta = (s: string) => s.replace(/[^A-Z0-9]/g, "");
  // prima le più lunghe ("ALFA ROMEO" prima di un'eventuale "ALFA")
  for (const m of [...MARCHE].sort((a, b) => b.length - a.length)) {
    const n = m.split(/[\s-]+/).length;
    for (let i = 0; i < parole.length; i++) {
      // si confrontano da 1 a n+1 parole consecutive, perché il trattino può essere letto come parola a sé
      for (let k = 1; k <= n + 1 && i + k <= parole.length; k++) {
        if (compatta(parole.slice(i, i + k).join("")) === compatta(m)) return m;
      }
    }
  }
  return null;
}

/** Il primo token del valore, se è tutto cifre (una "O" letta al posto dello zero va bene). */
function numero(testo: string, min: number, max: number): number | null {
  const token = testo.trim().split(/\s+/)[0]?.replace(/O/g, "0") ?? "";
  if (!/^\d{1,5}$/.test(token)) return null;
  const n = Number(token);
  return n >= min && n <= max ? n : null;
}

/** Converte il testo candidato di un campo nel valore del form (null se non plausibile). */
function valida(campo: Campo, testo: string): string | number | null {
  const t = MAIUSCOLO(testo);
  if (!t) return null;
  switch (campo) {
    case "targa":
      return leggiTarga(t);
    case "dataimmatricolazione":
      return leggiDate(t)[0] ?? null;
    case "marca":
      return leggiMarca(t) ?? (/^[A-Z]{2}[A-Z0-9 .&'\-]{0,28}$/.test(t) ? t.replace(/\s*-\s*/g, "-") : null);
    case "modello":
      return /[A-Z0-9]/.test(t) && t.length <= 40 ? t : null;
    case "tipo_veicolo":
      return leggiCategoria(t);
    case "alimentazione":
      return leggiAlimentazione(t);
    case "cilindrata":
      return numero(t, 40, 9999);
    case "potenza_kw":
      return numero(t, 1, 1500);
  }
}

/* ---------------- lettura per codici ---------------- */

const altezza = (b: Riquadro) => b.y1 - b.y0;

/** Parole-valore (senza minuscole) di una riga comprese fra due ascisse. */
function valoriFra(riga: RigaOcr, da: number, a: number): string {
  return riga.words
    .filter((w) => {
      const centro = (w.bbox.x0 + w.bbox.x1) / 2;
      return centro >= da && centro < a && eValore(w.text) && !eCodice(w.text);
    })
    .map((w) => w.text)
    .join(" ");
}

function leggiPerCodici(righe: RigaOcr[]): DatiLibretto {
  const trovati: DatiLibretto = {};
  righe.forEach((riga, r) => {
    const codici = riga.words.filter((w) => eCodice(w.text));
    codici.forEach((w, k) => {
      const c = codice(w.text);
      if (!c) return;
      const campo = CODICE_CAMPO[c];
      if (trovati[campo] !== undefined) return;
      // la colonna del campo finisce dove comincia il codice successivo sulla stessa riga
      const fine = codici[k + 1]?.bbox.x0 ?? Infinity;
      const sinistra = w.bbox.x0 - altezza(w.bbox);
      const candidati = [valoriFra(riga, w.bbox.x1, fine)];
      for (const sotto of righe.slice(r + 1, r + 3)) {
        if (sotto.bbox.y0 - riga.bbox.y1 > 3 * altezza(riga.bbox)) break;
        candidati.push(valoriFra(sotto, sinistra, fine === Infinity ? Infinity : fine - altezza(w.bbox) / 2));
      }
      for (const testo of candidati) {
        const v = valida(campo, testo);
        if (v !== null) {
          (trovati as Record<Campo, string | number>)[campo] = v;
          break;
        }
      }
    });
  });
  return trovati;
}

/* ---------------- lettura per forma del valore ---------------- */

function leggiPerForma(righe: RigaOcr[]): DatiLibretto {
  const testo = righe.map((r) => r.text).join("\n");
  const dati: DatiLibretto = {};
  // targa: gruppi di 1-3 parole consecutive lunghi esattamente 7 caratteri
  // (così non si pesca dentro un VIN o dentro "targa + date" attaccate);
  // vince quella letta senza correzioni, a parità la prima nel documento
  let migliore = null as { targa: string; correzioni: number } | null;
  for (const r of righe) {
    const parole = r.words.map((w) => w.text.toUpperCase().replace(/[^A-Z0-9]/g, "")).filter(Boolean);
    for (let i = 0; i < parole.length; i++) {
      for (let k = 1; k <= 3 && i + k <= parole.length; k++) {
        const gruppo = parole.slice(i, i + k).join("");
        if (gruppo.length !== 7) continue;
        const t = leggiTargaConCorrezioni(gruppo);
        if (t && (!migliore || t.correzioni < migliore.correzioni)) migliore = t;
      }
    }
    if (migliore?.correzioni === 0) break;
  }
  if (migliore) dati.targa = migliore.targa;
  // la prima immatricolazione è la data più vecchia del documento
  const date = leggiDate(testo).sort();
  if (date.length) dati.dataimmatricolazione = date[0];
  const marca = leggiMarca(testo);
  if (marca) dati.marca = marca;
  const alim = leggiAlimentazione(testo);
  if (alim) dati.alimentazione = alim;
  // cilindrata e potenza: sulla riga dell'alimentazione, i numeri che la precedono
  // (sul libretto P.1, P.2 e P.3 stanno in fila); contano solo i token fatti di sole cifre
  const rigaAlim = righe.find((r) => leggiAlimentazione(r.text) && /\d/.test(r.text));
  if (rigaAlim) {
    const iAlim = rigaAlim.words.findIndex((w) => leggiAlimentazione(w.text));
    const numeri = rigaAlim.words
      .slice(0, iAlim < 0 ? undefined : iAlim)
      .map((w) => w.text)
      .filter((t) => /^\d{1,5}$/.test(t))
      .map(Number);
    const iCc = numeri.findIndex((n) => n >= 40 && n <= 9999);
    if (iCc >= 0) {
      dati.cilindrata = numeri[iCc];
      const kw = numeri.slice(iCc + 1).find((n) => n >= 1 && n <= 1500);
      if (kw !== undefined) dati.potenza_kw = kw;
    }
  }
  // modello: sulla riga della marca, dopo il tipo/variante/versione (D.2, "177 / 012 / A180D")
  if (marca) {
    const rigaMarca = righe.find((r) => leggiMarca(r.text) === marca);
    const dopo = rigaMarca?.text
      .trim()
      .toUpperCase()
      .match(/\b[A-Z0-9]{1,6}\s*\/\s*[A-Z0-9]{1,6}\s*\/\s*[A-Z0-9]{1,8}\s+([A-Z0-9][A-Z0-9 .\-]{1,39})$/);
    if (dopo && dopo[1].trim().split(/\s+/).length <= 5) dati.modello = dopo[1].trim();
  }
  const cat = righe.map((r) => r.text).find((t) => /\b(M1|N1|L[1-7]E)\b/i.test(t));
  if (cat) {
    const tipo = leggiCategoria(cat.match(/\b(M1|N1|L[1-7]E)\b/i)?.[0] ?? "");
    if (tipo) dati.tipo_veicolo = tipo;
  }
  return dati;
}

/**
 * Dati del veicolo dalle righe OCR. `daVerificare` elenca i campi trovati
 * solo per forma (senza il codice accanto): nel form vanno evidenziati.
 */
export function leggiLibretto(righe: RigaOcr[]): { dati: DatiLibretto; daVerificare: Campo[] } {
  const perCodici = leggiPerCodici(righe);
  const perForma = leggiPerForma(righe);
  const dati: DatiLibretto = { ...perForma, ...perCodici };
  const daVerificare = (Object.keys(perForma) as Campo[]).filter((c) => perCodici[c] === undefined);
  // il modello si legge solo col suo codice: dedurlo porterebbe a errori
  return { dati, daVerificare };
}
