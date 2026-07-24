"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import Layout from "@/components/Layout";
import AzioniRapide from "@/components/home/AzioniRapide";
import GarageSection from "@/components/home/GarageSection";
import ScadenzeAvvisi from "@/components/home/ScadenzeAvvisi";
import { useAuth } from "@/context/AuthContext";
import { getVeicoliUtente, getVeicolo } from "@/lib/api";
import type { VeicoloDettaglio } from "@/lib/types";

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

  // la homepage lavora sui dettagli completi (scadenze incluse): la lista
  // degli id arriva da GET /veicolo/utente/:id, poi ogni veicolo è ricaricato
  // con getVeicolo (GET /veicolo/:id) — la STESSA funzione usata da
  // info-veicolo/page.tsx, così "Scadenze e avvisi" mostra esattamente
  // gli stessi dati (datascadenzabollo/datascadenzarca/isbolloattivo/isinsured)
  const caricaDettagli = useCallback(async () => {
    if (!utente) return;
    try {
      const lista = await getVeicoliUtente(utente.id);
      const dettagli = await Promise.all(lista.map((v) => getVeicolo(v.id)));
      setVeicoli(dettagli);
    } catch (err) {
      if (gestisci401(err)) return;
      console.error("Errore nel caricamento del garage", err);
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
