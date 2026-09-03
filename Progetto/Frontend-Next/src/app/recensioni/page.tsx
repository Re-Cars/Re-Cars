"use client";

import { useState } from "react";

import Layout from "@/components/Layout";

/**
 * Recensioni: come nel vanilla è una UI senza backend (mockup) —
 * form con selezione prenotazione, voto a stelle e testo.
 */
export default function RecensioniPage() {
  const [voto, setVoto] = useState(0);

  return (
    <Layout breadcrumb="Recensioni">
      <section className="page-hero">
        <h2 className="section-title-page">Recensioni</h2>
      </section>

      <section className="section">
        <div className="section-row">
          <div className="card show">
            <h3>
              <i className="fa-solid fa-pen-to-square" /> Lascia una Recensione
            </h3>
            <p>Puoi recensire solo le officine dove hai prenotato.</p>
            <div className="input-group">
              <i className="fa-solid fa-wrench" />
              <select defaultValue="">
                <option value="">— Seleziona prenotazione —</option>
              </select>
            </div>
            <div className="stelle-container">
              <p>Voto:</p>
              <div className="stelle">
                {[1, 2, 3, 4, 5].map((i) => (
                  <i
                    key={i}
                    className={`fa-solid fa-star stella${voto >= i ? " attiva" : ""}`}
                    onClick={() => setVoto(i)}
                  />
                ))}
              </div>
            </div>
            <div className="input-group input-group-textarea">
              <i className="fa-solid fa-comment" />
              <textarea placeholder="Scrivi la tua recensione..." rows={4} />
            </div>
            <button type="button" className="btn-landing btn-recensioni">
              <i className="fa-solid fa-paper-plane" /> Invia Recensione
            </button>
          </div>

          <div className="card show">
            <h3>
              <i className="fa-solid fa-star-half-stroke" /> Le tue Recensioni
            </h3>
            <p>Non hai ancora lasciato recensioni.</p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
