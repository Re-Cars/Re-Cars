"use client";

import { useEffect, useRef, useState } from "react";

import { leggiLibretto, type DatiLibretto, type RigaOcr } from "@/lib/libretto";

interface LibrettoFotoProps {
  /** Dati letti (solo quelli trovati) e campi trovati senza il codice del libretto. */
  onLetto: (dati: DatiLibretto, daVerificare: (keyof DatiLibretto)[]) => void;
}

type Fase = { tipo: "attesa" } | { tipo: "lettura"; testo: string; progresso: number } | { tipo: "errore"; testo: string };

const LATO_MAX = 2200;

/**
 * Foto → canvas pronto per l'OCR: orientamento EXIF applicato, lato lungo al
 * massimo 2200 px, scala di grigi e contrasto stirato (2°-98° percentile).
 */
async function preparaFoto(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scala = Math.min(1, LATO_MAX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scala);
  canvas.height = Math.round(bitmap.height * scala);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas non disponibile");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = img.data;
  const istogramma = new Uint32Array(256);
  for (let i = 0; i < px.length; i += 4) {
    const g = Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
    px[i] = g;
    istogramma[g]++;
  }
  const totale = px.length / 4;
  let basso = 0;
  let alto = 255;
  for (let v = 0, somma = 0; v < 256; v++) {
    somma += istogramma[v];
    if (somma > totale * 0.02) {
      basso = v;
      break;
    }
  }
  for (let v = 255, somma = 0; v >= 0; v--) {
    somma += istogramma[v];
    if (somma > totale * 0.02) {
      alto = v;
      break;
    }
  }
  const ampiezza = Math.max(1, alto - basso);
  for (let i = 0; i < px.length; i += 4) {
    const v = Math.max(0, Math.min(255, ((px[i] - basso) * 255) / ampiezza));
    px[i] = px[i + 1] = px[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

const STATI: Record<string, string> = {
  "loading tesseract core": "Preparo il lettore di testo (solo la prima volta)",
  "initializing tesseract": "Preparo il lettore di testo",
  "loading language traineddata": "Scarico l'italiano (solo la prima volta)",
  "initializing api": "Quasi pronto",
  "recognizing text": "Leggo il libretto",
};

/**
 * Scheda "Da foto libretto" di Aggiungi veicolo: la foto viene letta nel
 * browser con tesseract.js (nessun invio a server) e dal testo si ricavano
 * solo i dati del veicolo (lib/libretto.ts). Il risultato riempie il form
 * manuale, dove l'utente lo controlla prima di salvare.
 */
export default function LibrettoFoto({ onLetto }: LibrettoFotoProps) {
  const [fase, setFase] = useState<Fase>({ tipo: "attesa" });
  const [anteprima, setAnteprima] = useState<string | null>(null);
  const scattaRef = useRef<HTMLInputElement>(null);
  const scegliRef = useRef<HTMLInputElement>(null);
  const annullato = useRef(false);

  // chiusura dell'overlay durante la lettura: il risultato non serve più
  useEffect(() => {
    annullato.current = false;
    return () => {
      annullato.current = true;
    };
  }, []);
  useEffect(() => () => (anteprima ? URL.revokeObjectURL(anteprima) : undefined), [anteprima]);

  const leggi = async (file: File | undefined) => {
    if (!file) return;
    setAnteprima(URL.createObjectURL(file));
    setFase({ tipo: "lettura", testo: "Preparo la foto", progresso: 0 });
    try {
      const [canvas, { createWorker }] = await Promise.all([preparaFoto(file), import("tesseract.js")]);
      // la carta di circolazione piegata ha quattro facciate affiancate: letta
      // tutta insieme l'OCR mescola le colonne, quindi dopo la foto intera si
      // rilegge ogni quarto da solo. Le righe della foto intera vengono prima
      // (stessa lettura di sempre per il Documento Unico), i quarti aggiungono
      // quello che mancava.
      const { width: W, height: H } = canvas;
      const zone = [
        undefined,
        ...[
          [0, 0],
          [W / 2, 0],
          [0, H / 2],
          [W / 2, H / 2],
        ].map(([left, top]) => ({ left: Math.round(left), top: Math.round(top), width: Math.round(W / 2), height: Math.round(H / 2) })),
      ];
      let passo = 0;
      const worker = await createWorker("ita", 1, {
        logger: (m: { status: string; progress: number }) => {
          if (annullato.current) return;
          const lettura = m.status === "recognizing text";
          setFase({
            tipo: "lettura",
            testo: lettura ? `Leggo il libretto (${passo + 1} di ${zone.length})` : (STATI[m.status] ?? "Leggo il libretto"),
            progresso: lettura ? (passo + m.progress) / zone.length : m.progress,
          });
        },
      });
      try {
        const righe: RigaOcr[] = [];
        for (const rectangle of zone) {
          const { data } = await worker.recognize(canvas, rectangle ? { rectangle } : {}, { blocks: true });
          if (annullato.current) return;
          righe.push(
            ...(data.blocks ?? [])
              .flatMap((b) => b.paragraphs.flatMap((p) => p.lines))
              .map((l) => ({ text: l.text, bbox: l.bbox, words: l.words.map((w) => ({ text: w.text, bbox: w.bbox })) })),
          );
          passo++;
        }
        const { dati, daVerificare } = leggiLibretto(righe);
        if (Object.keys(dati).length === 0) {
          setFase({
            tipo: "errore",
            testo: "Non sono riuscito a leggere i dati: prova con più luce, il libretto dritto e a fuoco.",
          });
          return;
        }
        setFase({ tipo: "attesa" });
        onLetto(dati, daVerificare);
      } finally {
        await worker.terminate();
      }
    } catch (err) {
      console.error("Lettura del libretto non riuscita", err);
      if (!annullato.current) {
        setFase({ tipo: "errore", testo: "Lettura non riuscita: controlla la connessione (serve al primo uso) e riprova." });
      }
    }
  };

  const inLettura = fase.tipo === "lettura";

  return (
    <div className="lf">
      <div className="lf-privacy">
        <i className="ti ti-shield-lock" />
        <p>
          <b>La foto non lascia il tuo dispositivo.</b> Il testo viene letto qui, nel browser: non la salviamo e non la
          inviamo a nessuno. Leggiamo solo i dati del veicolo, non nome, indirizzo o codice fiscale.
        </p>
      </div>

      <div className={`lf-area${anteprima ? " con-foto" : ""}`}>
        {anteprima ? (
          // anteprima locale (blob:), non gestibile da next/image
          // eslint-disable-next-line @next/next/no-img-element
          <img src={anteprima} alt="Foto del libretto" />
        ) : (
          <div className="lf-guida">
            <i className="ti ti-id" />
            <span>Inquadra la pagina con i dati del veicolo (righe A, B, D, P), dritta e ben illuminata.</span>
          </div>
        )}
        {inLettura && (
          <div className="lf-lettura" role="status">
            <span>{fase.testo}…</span>
            <div className="lf-barra">
              <i style={{ width: `${Math.round(fase.progresso * 100)}%` }} />
            </div>
          </div>
        )}
      </div>

      {fase.tipo === "errore" && (
        <p className="ov-err" role="alert">
          <i className="ti ti-alert-circle" />
          {fase.testo}
        </p>
      )}

      <div className="lf-bottoni">
        <button type="button" className="btn-dash btn-dash-primary" disabled={inLettura} onClick={() => scattaRef.current?.click()}>
          <i className="ti ti-camera" />
          Scatta una foto
        </button>
        <button type="button" className="btn-dash btn-dash-ghost" disabled={inLettura} onClick={() => scegliRef.current?.click()}>
          <i className="ti ti-photo" />
          Scegli un&apos;immagine
        </button>
      </div>
      <input
        ref={scattaRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          void leggi(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={scegliRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          void leggi(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
