"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import OfficinaLayout from "@/components/officina/OfficinaLayout";
import {
  aggiornaProfiloOfficina,
  ApiError,
  eliminaProfiloOfficina,
  getProfiloOfficina,
} from "@/lib/api";
import { clearAll } from "@/lib/storage";
import type { ProfiloOfficinaResponse } from "@/lib/types";

const TIPI_DISPONIBILI = [
  "meccanica",
  "carrozzeria",
  "gommista",
  "elettrauto",
  "multimarca",
  "concessionaria",
  "tagliando",
  "revisione",
] as const;

const LABEL_CAMPI: Record<string, string> = {
  nome: "Nome officina",
  ragione_sociale: "Ragione sociale",
  partita_iva: "Partita IVA",
  codice_sdi: "Codice SDI",
  email: "Email",
  telefono: "Telefono",
  indirizzo: "Indirizzo",
  ponti_disponibili: "Ponti disponibili",
  password: "Nuova password",
};

const NOMI_PIANI_OFFICINA: Record<string, string> = {
  officina_business: "Business",
  officina_business_pro: "Business Pro",
};

const CAMPI_DATI = [
  { campo: "nome", label: "Nome officina" },
  { campo: "ragione_sociale", label: "Ragione sociale" },
  { campo: "partita_iva", label: "Partita IVA" },
  { campo: "codice_sdi", label: "Codice SDI" },
  { campo: "email", label: "Email" },
  { campo: "telefono", label: "Telefono" },
  { campo: "indirizzo", label: "Indirizzo" },
  { campo: "ponti_disponibili", label: "Ponti disponibili" },
] as const;

/**
 * Profilo officina: hero con anagrafica, stats, dati modificabili,
 * servizi offerti (pill toggle), abbonamento e zona pericolosa.
 */
export default function ProfiloOfficinaPage() {
  const router = useRouter();
  const [profilo, setProfilo] = useState<ProfiloOfficinaResponse | null>(null);
  const [tipiAttivi, setTipiAttivi] = useState<string[]>([]);
  const [tipiModificati, setTipiModificati] = useState(false);
  const [campoInModifica, setCampoInModifica] = useState<string | null>(null);
  const [valoreCampo, setValoreCampo] = useState("");
  const [erroreCampo, setErroreCampo] = useState("");
  const [confermaElimina, setConfermaElimina] = useState(false);

  const carica = useCallback(async () => {
    try {
      const data = await getProfiloOfficina();
      setProfilo(data);
      setTipiAttivi(data.officina.tipi ?? []);
      setTipiModificati(false);
    } catch (err) {
      console.error("Errore caricamento profilo:", err);
    }
  }, []);

  useEffect(() => {
    void carica();
  }, [carica]);

  const of = profilo?.officina;
  const stats = profilo?.stats;
  const abbonamento = of?.abbonamento?.[0];
  const piano = abbonamento?.piano ?? "officina_business";
  const diffMese = stats ? stats.mese - stats.mesePrecedente : 0;

  const apriModifica = (campo: string) => {
    setCampoInModifica(campo);
    setErroreCampo("");
    const attuale = campo === "password" ? "" : (of?.[campo as keyof typeof of] ?? "");
    setValoreCampo(String(attuale ?? ""));
  };

  const salvaModifica = async () => {
    if (!campoInModifica) return;
    const valore = valoreCampo.trim();
    if (!valore) {
      setErroreCampo("Il campo non può essere vuoto");
      return;
    }
    try {
      await aggiornaProfiloOfficina({
        [campoInModifica]:
          campoInModifica === "ponti_disponibili" ? Number(valore) : valore,
      });
      setCampoInModifica(null);
      await carica();
    } catch (err) {
      setErroreCampo(err instanceof ApiError ? err.message : "Errore di connessione");
    }
  };

  const toggleTipo = (tipo: string) => {
    setTipiAttivi((attivi) =>
      attivi.includes(tipo) ? attivi.filter((t) => t !== tipo) : [...attivi, tipo],
    );
    setTipiModificati(true);
  };

  const salvaTipi = async () => {
    try {
      await aggiornaProfiloOfficina({ tipi: tipiAttivi });
      setTipiModificati(false);
    } catch (err) {
      console.error("Errore salvataggio tipi:", err);
    }
  };

  const eliminaProfilo = async () => {
    setConfermaElimina(false);
    try {
      await eliminaProfiloOfficina();
      clearAll();
      document.cookie = "rc_session=; path=/; max-age=0";
      router.push("/");
    } catch (err) {
      console.error("Errore eliminazione:", err);
    }
  };

  return (
    <OfficinaLayout briciole={[{ label: "Profilo Officina" }]}>
      <div className="po-dashboard">
        {/* Hero */}
        <div className="po-hero">
          <div className="po-hero-logo">
            <i className="fa-solid fa-building-user" />
          </div>
          <div className="po-hero-info">
            <div className="po-hero-nome">{of?.nome ?? of?.ragione_sociale ?? "Caricamento..."}</div>
            <div className="po-hero-sub">
              <span>
                <i className="fa-solid fa-location-dot" /> {of?.indirizzo ?? "—"}, {of?.sigla_citta ?? ""}
              </span>
              <span>
                <i className="fa-solid fa-phone" /> {of?.telefono ?? "—"}
              </span>
              <span>
                <i className="fa-solid fa-envelope" /> {of?.email ?? "—"}
              </span>
              <span className="po-abbonamento-badge">
                <i className="fa-solid fa-crown" />
                <span>{NOMI_PIANI_OFFICINA[piano] ?? piano}</span>
              </span>
            </div>
            <div className="po-hero-actions">
              <button type="button" className="po-btn-primary" onClick={() => apriModifica("password")}>
                <i className="fa-solid fa-key" /> Cambia password
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="po-stats-grid">
          <div className="po-stat">
            <div className="po-stat-label">Prenotazioni totali</div>
            <div className="po-stat-value">{stats?.totale ?? "—"}</div>
            <div className="po-stat-sub">da sempre</div>
          </div>
          <div className="po-stat">
            <div className="po-stat-label">Questo mese</div>
            <div className="po-stat-value">{stats?.mese ?? "—"}</div>
            <div className="po-stat-sub">
              {stats
                ? `${diffMese >= 0 ? "+" : ""}${diffMese} rispetto al mese scorso`
                : "—"}
            </div>
          </div>
          <div className="po-stat">
            <div className="po-stat-label">Completate</div>
            <div className="po-stat-value">{stats?.completate ?? "—"}</div>
            <div className="po-stat-sub">
              {stats ? `${stats.tassoCompletamento}% tasso completamento` : "—"}
            </div>
          </div>
          <div className="po-stat">
            <div className="po-stat-label">Ponti disponibili</div>
            <div className="po-stat-value">{of?.ponti_disponibili ?? "—"}</div>
            <div className="po-stat-sub">configurati</div>
          </div>
        </div>

        {/* Dati officina */}
        <div className="po-section">
          <div className="po-section-bar">
            <i className="fa-solid fa-circle-info" />
            <span>Dati officina</span>
          </div>
          <div className="po-section-body">
            {CAMPI_DATI.map(({ campo, label }) => (
              <div key={campo} className="po-field-row">
                <div className="po-field-lbl">
                  <span>{label}</span>
                  <span>{String(of?.[campo] ?? "—") || "—"}</span>
                </div>
                <button type="button" className="po-btn-edit" onClick={() => apriModifica(campo)}>
                  <i className="fa-solid fa-pen" /> Modifica
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Servizi */}
        <div className="po-section">
          <div className="po-section-bar">
            <i className="fa-solid fa-screwdriver-wrench" />
            <span>Servizi offerti</span>
          </div>
          <div className="po-section-body">
            <div className="po-tipi-grid">
              {TIPI_DISPONIBILI.map((t) => (
                <span
                  key={t}
                  className={`po-tipo-pill${tipiAttivi.includes(t) ? " attivo" : ""}`}
                  onClick={() => toggleTipo(t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </span>
              ))}
            </div>
            {tipiModificati && (
              <button
                type="button"
                className="po-btn-primary po-btn-salva-tipi"
                onClick={() => void salvaTipi()}
              >
                <i className="fa-solid fa-floppy-disk" /> Salva modifiche
              </button>
            )}
          </div>
        </div>

        {/* Abbonamento */}
        <div className="po-section">
          <div className="po-section-bar">
            <i className="fa-solid fa-credit-card" />
            <span>Abbonamento</span>
          </div>
          <div className="po-section-body">
            <div className="po-piano-row">
              <div className="po-piano-attivo-left">
                <span className="po-piano-label">Piano attivo</span>
                <span className="po-piano-nome">{NOMI_PIANI_OFFICINA[piano] ?? piano}</span>
                <span className="po-piano-sub">
                  {abbonamento?.data_fine
                    ? `Rinnovo il ${new Date(abbonamento.data_fine).toLocaleDateString("it-IT")}`
                    : "Rinnovo automatico mensile"}
                </span>
              </div>
              <span className="po-piano-stato">
                <span className="po-piano-stato-dot" />
                Attivo
              </span>
            </div>
            <Link href="/abbonamenti-officina" className="po-btn-primary po-btn-gestisci">
              <i className="fa-solid fa-arrow-right" />
              Gestisci abbonamento
            </Link>
          </div>
        </div>

        {/* Zona pericolosa */}
        <div className="po-section po-danger-section">
          <div className="po-section-bar po-danger-bar">
            <i className="fa-solid fa-triangle-exclamation" />
            <span>Zona pericolosa</span>
          </div>
          <div className="po-section-body">
            <div className="po-danger-row">
              <div className="po-danger-text">
                <p>Elimina profilo officina</p>
                <p>Azione irreversibile. Tutti i dati e le prenotazioni verranno eliminati permanentemente.</p>
              </div>
              <button type="button" className="po-btn-danger" onClick={() => setConfermaElimina(true)}>
                <i className="fa-solid fa-trash" /> Elimina
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay modifica campo */}
      {campoInModifica && (
        <div className="po-overlay open" onClick={() => setCampoInModifica(null)}>
          <div className="po-modal" onClick={(e) => e.stopPropagation()}>
            <div className="po-modal-title">
              <i className="fa-solid fa-pen po-icon-brand" />
              <span>{LABEL_CAMPI[campoInModifica] ?? campoInModifica}</span>
            </div>
            <input
              type={campoInModifica === "password" ? "password" : "text"}
              className="po-input"
              value={valoreCampo}
              autoFocus
              onChange={(e) => setValoreCampo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void salvaModifica();
                if (e.key === "Escape") setCampoInModifica(null);
              }}
            />
            <p className="po-error">{erroreCampo}</p>
            <div className="po-modal-actions">
              <button type="button" className="po-btn-ghost" onClick={() => setCampoInModifica(null)}>
                Annulla
              </button>
              <button type="button" className="po-btn-primary" onClick={() => void salvaModifica()}>
                Salva
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay conferma elimina */}
      {confermaElimina && (
        <div className="po-overlay open" onClick={() => setConfermaElimina(false)}>
          <div className="po-modal po-modal-danger" onClick={(e) => e.stopPropagation()}>
            <div className="po-modal-title">
              <i className="fa-solid fa-trash po-icon-danger" />
              <span>Elimina profilo</span>
            </div>
            <p className="po-modal-sub">
              Questa azione è irreversibile. Tutti i dati e le prenotazioni verranno eliminati
              permanentemente.
            </p>
            <div className="po-modal-actions">
              <button type="button" className="po-btn-ghost" onClick={() => setConfermaElimina(false)}>
                Annulla
              </button>
              <button type="button" className="po-btn-danger" onClick={() => void eliminaProfilo()}>
                Elimina definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </OfficinaLayout>
  );
}
