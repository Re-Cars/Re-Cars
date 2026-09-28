"use client";

import { useEffect, useState } from "react";

import Layout from "@/components/Layout";
import VeicoloInfoCard from "@/components/VeicoloInfoCard";
import VeicoloPicker from "@/components/VeicoloPicker";
import { useAuth } from "@/context/AuthContext";
import { getVeicolo } from "@/lib/api";
import type { VeicoloDettaglio } from "@/lib/types";

/**
 * Info veicolo: hero con nome/targa/tipo/anno, caratteristiche tecniche e
 * stato mantenimento (bollo, assicurazione) del veicolo attivo, contenuto
 * in VeicoloInfoCard. Si cambia veicolo dal selettore nell'hero.
 */
export default function InfoVeicoloPage() {
  const { veicoloAttivo, gestisci401, selezionaVeicolo } = useAuth();
  const [dettaglio, setDettaglio] = useState<VeicoloDettaglio | null>(null);

  // un link con ?id= seleziona quel veicolo come attivo
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
      <div className="pg" style={{ maxWidth: 880, paddingInline: 24, paddingBottom: 0 }}>
        <section className="pg-hero">
          <div className="pg-hero-ttl">
            <h1>
              <i className="ti ti-id" />
              Info veicolo
            </h1>
            <p>Dati tecnici e mantenimento del veicolo selezionato.</p>
          </div>
          <VeicoloPicker />
        </section>
      </div>
      <VeicoloInfoCard veicolo={dettaglio} />
    </Layout>
  );
}
