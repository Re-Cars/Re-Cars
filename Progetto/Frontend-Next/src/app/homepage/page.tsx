"use client";

import { useCallback, useEffect, useState } from "react";

import Layout from "@/components/Layout";
import AzioniRapide from "@/components/home/AzioniRapide";
import GarageSection from "@/components/home/GarageSection";
import { useAuth } from "@/context/AuthContext";
import { getVeicoliUtente, getVeicolo } from "@/lib/api";
import type { VeicoloDettaglio } from "@/lib/types";

/**
 * Homepage utente: sezione "Il mio garage" (rail dei veicoli + scheda
 * tecnica del veicolo selezionato, card aggiungi sempre prima voce — gli
 * stessi pallini di stato della rail sostituiscono il vecchio pannello
 * "Scadenze e avvisi", ridondante con quei pallini e con la scheda) e le
 * tre card azione fisse.
 */
export default function HomePage() {
  const { utente, gestisci401, caricaVeicoli } = useAuth();

  const [veicoli, setVeicoli] = useState<VeicoloDettaglio[]>([]);

  // la homepage lavora sui dettagli completi: la lista degli id arriva da
  // GET /veicolo/utente/:id, poi ogni veicolo è ricaricato con getVeicolo
  // (GET /veicolo/:id) — la STESSA funzione usata da info-veicolo/page.tsx,
  // così la scheda nel pannello di dettaglio mostra esattamente gli stessi
  // dati della pagina dedicata.
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

  return (
    <Layout mostraSwitcher={false}>
      <main className="hp-main">
        <GarageSection veicoli={veicoli} onGarageCambiato={onGarageCambiato} />
        <AzioniRapide />
      </main>
    </Layout>
  );
}
