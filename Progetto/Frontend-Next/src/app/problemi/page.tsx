"use client";

import Layout from "@/components/Layout";

/**
 * Diario problemi: come nel vanilla è una UI senza backend (mockup) —
 * form di segnalazione e diario vuoto.
 */
export default function ProblemiPage() {
  return (
    <Layout breadcrumb="Problemi">
      <section className="page-hero">
        <h2 className="section-title-page">Diario Problemi</h2>
      </section>

      <section className="section">
        <div className="section-row">
          <div className="card show">
            <h3>
              <i className="fa-solid fa-triangle-exclamation" /> Segnala un Problema
            </h3>
            <div className="input-group">
              <i className="fa-solid fa-car" />
              <select defaultValue="">
                <option value="">— Seleziona veicolo —</option>
              </select>
            </div>
            <div className="input-group">
              <i className="fa-solid fa-calendar" />
              <input type="date" />
            </div>
            <div className="input-group">
              <i className="fa-solid fa-tag" />
              <select defaultValue="">
                <option value="">— Categoria —</option>
                <option>Motore</option>
                <option>Freni</option>
                <option>Elettrico</option>
                <option>Carrozzeria</option>
                <option>Gomme</option>
                <option>Altro</option>
              </select>
            </div>
            <div className="input-group input-group-textarea">
              <i className="fa-solid fa-pen" />
              <textarea placeholder="Descrivi il problema..." rows={4} />
            </div>
            <button type="button" className="btn-landing btn-problemi">
              <i className="fa-solid fa-plus" /> Aggiungi
            </button>
          </div>

          <div className="card show">
            <h3>
              <i className="fa-solid fa-book" /> Diario Problemi
            </h3>
            <p>Nessun problema segnalato.</p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
