"use client";

import { useCallback, useEffect, useState } from "react";

import Layout from "@/components/Layout";
import AzioniRapide from "@/components/home/AzioniRapide";
import GarageSection from "@/components/home/GarageSection";
import InfoVeicoloPanel from "@/components/home/InfoVeicoloPanel";
import { useAuth } from "@/context/AuthContext";
import { getInterventiVeicolo, getVeicoliUtente, getVeicolo } from "@/lib/api";
import type { VeicoloDettaglio } from "@/lib/types";

/**
 * Dashboard utente a viewport unica: "Il mio garage" (lista scorrevole +
 * ricerca) a sinistra, scheda del veicolo selezionato a destra con la
 * stessa altezza, azioni rapide in basso. Sopra i 900px di larghezza la
 * pagina non scorre (vedi .dash in globals.css).
 */
export default function HomePage() {
  const { utente, gestisci401, caricaVeicoli, veicoloAttivo, selezionaVeicolo, eliminaVeicoloDalGarage } =
    useAuth();

  const [veicoli, setVeicoli] = useState<VeicoloDettaglio[]>([]);
  const [speseAnno, setSpeseAnno] = useState<number | null>(null);

  // la dashboard lavora sui dettagli completi: la lista degli id arriva da
  // GET /veicolo/utente/:id, poi ogni veicolo è ricaricato con getVeicolo
  // (GET /veicolo/:id), la stessa funzione usata da info-veicolo/page.tsx.
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

  // totale speso nell'anno su tutto il garage, per la card "Costi di gestione":
  // se una chiamata fallisce la card resta senza cifra, senza bloccare la pagina
  useEffect(() => {
    if (veicoli.length === 0) {
      setSpeseAnno(null);
      return;
    }
    let annullato = false;
    const anno = String(new Date().getFullYear());
    Promise.all(veicoli.map((v) => getInterventiVeicolo(v.id)))
      .then((liste) => {
        if (annullato) return;
        const totale = liste
          .flat()
          .filter((i) => i.data.startsWith(anno))
          .reduce((somma, i) => somma + (Number(i.costo) || 0), 0);
        setSpeseAnno(totale);
      })
      .catch((err) => {
        if (!annullato && !gestisci401(err)) setSpeseAnno(null);
      });
    return () => {
      annullato = true;
    };
  }, [veicoli, gestisci401]);

  // dopo un'aggiunta o un'eliminazione si riallineano anche i veicoli del context
  const onGarageCambiato = useCallback(async () => {
    await caricaDettagli();
    await caricaVeicoli();
  }, [caricaDettagli, caricaVeicoli]);

  const onElimina = useCallback(
    async (id: number) => {
      const ok = await eliminaVeicoloDalGarage(id);
      if (ok) await caricaDettagli();
      return ok;
    },
    [eliminaVeicoloDalGarage, caricaDettagli],
  );

  const selezionato = veicoli.find((v) => v.id === veicoloAttivo?.id) ?? veicoli[0] ?? null;

  return (
    <Layout mostraSwitcher={false}>
      <main className="dash">
        <GarageSection
          veicoli={veicoli}
          selezionatoId={selezionato?.id ?? null}
          onSeleziona={selezionaVeicolo}
          onGarageCambiato={onGarageCambiato}
          onElimina={onElimina}
        />
        <InfoVeicoloPanel veicolo={selezionato} />
        <AzioniRapide speseAnno={speseAnno} />
      </main>
    </Layout>
  );
}
