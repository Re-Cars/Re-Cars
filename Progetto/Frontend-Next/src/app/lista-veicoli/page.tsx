"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import Layout from "@/components/Layout";
import AggiungiVeicoloOverlay from "@/components/AggiungiVeicoloOverlay";
import { AggiungiVeicoloCard, VeicoloCard } from "@/components/home/VeicoloCard";
import { useAuth } from "@/context/AuthContext";
import { getVeicoliUtente } from "@/lib/api";
import type { VeicoloDettaglio } from "@/lib/types";

/**
 * Lista veicoli: tutte le card del garage (stessi stili e hover della
 * homepage) in griglia responsive 1→3 colonne, con header (titolo,
 * contatore, bottone aggiungi) e card "Aggiungi un veicolo" in coda.
 */
export default function ListaVeicoliPage() {
  const router = useRouter();
  const { utente, veicoloAttivo, selezionaVeicolo, gestisci401, caricaVeicoli } = useAuth();

  const [veicoli, setVeicoli] = useState<VeicoloDettaglio[]>([]);
  const [modalAperto, setModalAperto] = useState(false);

  // stessa chiamata della homepage: GET /veicolo/utente/:id (dettagli completi)
  const caricaDettagli = useCallback(async () => {
    if (!utente) return;
    try {
      const data = await getVeicoliUtente(utente.id);
      setVeicoli(data);
    } catch (err) {
      if (gestisci401(err)) return;
      console.error("Errore nel caricamento dei veicoli", err);
    }
  }, [utente, gestisci401]);

  useEffect(() => {
    void caricaDettagli();
  }, [caricaDettagli]);

  // dopo un'aggiunta si riallinea anche la lista compatta del context
  const onGarageCambiato = useCallback(async () => {
    await caricaDettagli();
    await caricaVeicoli();
  }, [caricaDettagli, caricaVeicoli]);

  const apriVeicolo = (v: VeicoloDettaglio) => {
    selezionaVeicolo(v.id);
    router.push(`/info-veicolo?id=${v.id}`);
  };

  return (
    <Layout breadcrumb="Lista veicoli" mostraSwitcher={false}>
      <main className="hp-main">
        <section className="hp-garage">
          <div className="lv-head">
            <h2 className="hp-section-title lv-head-title">
              <i className="ti ti-car" />
              Il mio garage
              <span className="lv-counter">
                {veicoli.length} veicol{veicoli.length === 1 ? "o" : "i"}
              </span>
            </h2>
            <button type="button" className="lv-btn-aggiungi" onClick={() => setModalAperto(true)}>
              <i className="ti ti-plus" />
              Aggiungi veicolo
            </button>
          </div>

          <div className="garage-grid">
            {veicoli.map((v) => (
              <VeicoloCard
                key={v.id}
                veicolo={v}
                attivo={veicoloAttivo?.id === v.id}
                onClick={() => apriVeicolo(v)}
              />
            ))}
            <AggiungiVeicoloCard onClick={() => setModalAperto(true)} />
          </div>
        </section>
      </main>

      <AggiungiVeicoloOverlay
        aperto={modalAperto}
        onChiudi={() => setModalAperto(false)}
        onAggiunto={onGarageCambiato}
      />
    </Layout>
  );
}
