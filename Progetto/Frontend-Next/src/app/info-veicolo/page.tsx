"use client";

import { useEffect, useState } from "react";

import Layout from "@/components/Layout";
import VeicoloInfoCard from "@/components/VeicoloInfoCard";
import { useAuth } from "@/context/AuthContext";
import { getVeicolo } from "@/lib/api";
import type { VeicoloDettaglio } from "@/lib/types";

/**
 * Info veicolo: hero con nome/targa/tipo/anno, caratteristiche tecniche e
 * stato mantenimento (bollo, assicurazione) del veicolo attivo. Il
 * contenuto vero e proprio è in VeicoloInfoCard, condiviso con il pannello
 * di dettaglio della sezione "Il mio garage" in homepage. Cambia veicolo
 * dallo switcher e i dati si ricaricano.
 */
export default function InfoVeicoloPage() {
  const { veicoloAttivo, gestisci401, selezionaVeicolo } = useAuth();
  const [dettaglio, setDettaglio] = useState<VeicoloDettaglio | null>(null);

  // le card garage della homepage passano ?id=: si allinea il veicolo attivo
  // (letto da window.location per evitare il Suspense richiesto da useSearchParams)
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("id");
    const id = raw ? Number.parseInt(raw, 10) : Number.NaN;
    if (!Number.isNaN(id)) selezionaVeicolo(id);
  }, [selezionaVeicolo]);

  useEffect(() => {
    if (!veicoloAttivo) return;
    let annullato = false;
    getVeicolo(veicoloAttivo.id)
      .then((data) => {
        if (!annullato) setDettaglio(data);
      })
      .catch((err) => {
        if (!gestisci401(err)) console.error("Errore nel caricamento info veicolo", err);
      });
    return () => {
      annullato = true;
    };
  }, [veicoloAttivo, gestisci401]);

  return (
    <Layout breadcrumb="Info Veicolo">
      <VeicoloInfoCard veicolo={dettaglio} />
    </Layout>
  );
}
