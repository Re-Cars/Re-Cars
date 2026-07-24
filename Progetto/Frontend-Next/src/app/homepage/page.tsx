"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import Layout from "@/components/Layout";
import AzioniRapide from "@/components/home/AzioniRapide";
import GarageSection from "@/components/home/GarageSection";
import ScadenzeAvvisi from "@/components/home/ScadenzeAvvisi";
import { useAuth } from "@/context/AuthContext";
import { ApiError, getVeicoliUtente } from "@/lib/api";
import type { VeicoloDettaglio } from "@/lib/types";

/** Data ISO a `giorni` da oggi, per scadenze mock sempre significative. */
function tra(giorni: number): string {
  const d = new Date();
  d.setDate(d.getDate() + giorni);
  return d.toISOString().slice(0, 10);
}

/**
 * Fallback quando il backend non è raggiungibile (errore di rete, non
 * HTTP): la homepage resta navigabile e mostra tutte le fasce di
 * scadenza (scaduta / entro 30 giorni / entro 90 giorni).
 */
const VEICOLI_MOCK: VeicoloDettaglio[] = [
  {
    id: -1,
    targa: "AB123CD",
    marca: "Fiat",
    modello: "Panda",
    dati_generici: [{ tipo_veicolo: "Auto", alimentazione: "Benzina", cavalli: 70 }],
    dati_specifici: [
      { dataimmatricolazione: "2019-05-10", datascadenzabollo: tra(-12), isbolloattivo: false, datascadenzarca: tra(20), isinsured: true },
    ],
  },
  {
    id: -2,
    targa: "EF456GH",
    marca: "Volkswagen",
    modello: "Golf",
    dati_generici: [{ tipo_veicolo: "Auto", alimentazione: "Diesel", cavalli: 115 }],
    dati_specifici: [
      { dataimmatricolazione: "2021-09-02", datascadenzabollo: tra(75), isbolloattivo: true, datascadenzarca: tra(200), isinsured: true },
    ],
  },
  {
    id: -3,
    targa: "IL789MN",
    marca: "Yamaha",
    modello: "MT-07",
    dati_generici: [{ tipo_veicolo: "Moto", alimentazione: "Benzina", cavalli: 73 }],
    dati_specifici: [
      { dataimmatricolazione: "2023-03-15", datascadenzabollo: tra(300), isbolloattivo: true, datascadenzarca: tra(310), isinsured: true },
    ],
  },
  {
    id: -4,
    targa: "OP012QR",
    marca: "Toyota",
    modello: "Yaris",
    dati_generici: [{ tipo_veicolo: "Auto", alimentazione: "Ibrida", cavalli: 92 }],
    dati_specifici: [
      { dataimmatricolazione: "2020-01-20", datascadenzabollo: tra(150), isbolloattivo: true, datascadenzarca: tra(5), isinsured: true },
    ],
  },
];

/**
 * Homepage utente: sezione "Il mio garage" (griglia veicoli espandibile +
 * card aggiungi con modale ricerca targa), pannello "Scadenze e avvisi"
 * calcolato su bollo/assicurazione/revisione, e le tre card azione fisse.
 */
export default function HomePage() {
  const { utente, gestisci401, caricaVeicoli } = useAuth();

  const [veicoli, setVeicoli] = useState<VeicoloDettaglio[]>([]);
  const [garageEspanso, setGarageEspanso] = useState(false);
  const garageRef = useRef<HTMLDivElement>(null);

  // la homepage lavora sui dettagli completi (scadenze incluse), non sulla
  // versione compatta del context: fetch dedicata di GET /veicolo/utente/:id
  const caricaDettagli = useCallback(async () => {
    if (!utente) return;
    try {
      const data = await getVeicoliUtente(utente.id);
      setVeicoli(data);
    } catch (err) {
      if (gestisci401(err)) return;
      console.error("Errore nel caricamento del garage", err);
      // errore di rete (backend giù): fallback mock per mantenere la pagina usabile
      if (!(err instanceof ApiError)) setVeicoli(VEICOLI_MOCK);
    }
  }, [utente, gestisci401]);

  useEffect(() => {
    void caricaDettagli();
  }, [caricaDettagli]);

  // dopo un'aggiunta dal modale si riallineano anche i veicoli del context
  // (switcher/altre pagine usano la lista compatta)
  const onGarageCambiato = useCallback(async () => {
    await caricaDettagli();
    await caricaVeicoli();
  }, [caricaDettagli, caricaVeicoli]);

  // la voce sidebar "Lista veicoli" porta qui: scroll alla sezione garage
  // ed espansione della griglia se compressa (evento custom + hash #garage)
  useEffect(() => {
    const apriGarage = () => {
      setGarageEspanso(true);
      garageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    if (window.location.hash === "#garage") apriGarage();
    window.addEventListener("recars:apri-garage", apriGarage);
    return () => window.removeEventListener("recars:apri-garage", apriGarage);
  }, []);

  return (
    <Layout mostraSwitcher={false}>
      <main className="hp-main">
        <div ref={garageRef}>
          <GarageSection
            veicoli={veicoli}
            espanso={garageEspanso}
            onToggleEspanso={() => setGarageEspanso((v) => !v)}
            onGarageCambiato={onGarageCambiato}
          />
        </div>
        <ScadenzeAvvisi veicoli={veicoli} />
        <AzioniRapide />
      </main>
    </Layout>
  );
}
