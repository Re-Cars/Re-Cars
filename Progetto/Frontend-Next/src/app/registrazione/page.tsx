"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import AuthShell from "@/components/AuthShell";
import { useAuth } from "@/context/AuthContext";
import {
  ApiError,
  cercaCitta,
  logApiError,
  registraOfficina,
  registraUtente,
} from "@/lib/api";
import type { Citta } from "@/lib/types";

type TipoRegistrazione = "privato" | "azienda" | "officina" | null;

/** Registrazione a step per privato, azienda e officina (come landing.html). */
export default function RegistrazionePage() {
  const router = useRouter();
  const { aggiornaUtente } = useAuth();

  const [tipo, setTipo] = useState<TipoRegistrazione>(null);
  const [errore, setErrore] = useState("");
  const [inCorso, setInCorso] = useState(false);

  // privato + azienda
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // azienda + officina
  const [ragioneSociale, setRagioneSociale] = useState("");
  const [partitaIva, setPartitaIva] = useState("");
  const [codiceSdi, setCodiceSdi] = useState("");
  // officina
  const [nomeOfficina, setNomeOfficina] = useState("");
  const [telefono, setTelefono] = useState("");
  const [indirizzo, setIndirizzo] = useState("");
  const [cittaInput, setCittaInput] = useState("");
  const [siglaCitta, setSiglaCitta] = useState("");
  const [suggerimentiCitta, setSuggerimentiCitta] = useState<Citta[]>([]);

  const onCercaCitta = async (query: string) => {
    setCittaInput(query);
    if (query.length < 2) {
      setSuggerimentiCitta([]);
      return;
    }
    try {
      setSuggerimentiCitta(await cercaCitta(query));
    } catch {
      setSuggerimentiCitta([]);
    }
  };

  const selezionaCitta = (citta: Citta) => {
    setCittaInput(citta.nome);
    setSiglaCitta(citta.sigla);
    setSuggerimentiCitta([]);
  };

  const registra = async (e: FormEvent) => {
    e.preventDefault();
    if (inCorso) return;
    if (!tipo) {
      setErrore("Seleziona un tipo di account");
      return;
    }
    setInCorso(true);
    setErrore("");
    try {
      if (tipo === "officina") {
        const data = await registraOfficina({
          email: email.trim(),
          password,
          nome: nomeOfficina.trim(),
          ragione_sociale: ragioneSociale.trim(),
          partita_iva: partitaIva.trim(),
          codice_sdi: codiceSdi.trim() || null,
          telefono: telefono.trim(),
          indirizzo: indirizzo.trim(),
          sigla_citta: siglaCitta,
        });
        aggiornaUtente(data.officina);
        router.push("/officina");
      } else {
        const body =
          tipo === "privato"
            ? { username: username.trim(), email: email.trim(), password, tipo: "privato" as const }
            : {
                username: username.trim(),
                email: email.trim(),
                password,
                tipo: "azienda" as const,
                ragione_sociale: ragioneSociale.trim(),
                partita_iva: partitaIva.trim(),
                codice_sdi: codiceSdi.trim() || null,
              };
        const data = await registraUtente(body);
        aggiornaUtente(data.utente);
        router.push("/homepage");
      }
    } catch (err) {
      logApiError("registrazione", err);
      setErrore(err instanceof ApiError ? err.message : "Errore di connessione al server");
    } finally {
      setInCorso(false);
    }
  };

  return (
    <AuthShell toggleHref="/login" toggleLabel="Accedi" toggleIcona="fa-right-to-bracket">
      {tipo === null ? (
        <div className="auth-step">
          <div className="auth-tipo-group">
            <button type="button" className="auth-tipo-btn" onClick={() => setTipo("privato")}>
              <i className="fa-solid fa-user" />
              <span>Privato</span>
            </button>
            <button type="button" className="auth-tipo-btn" onClick={() => setTipo("azienda")}>
              <i className="fa-solid fa-briefcase" />
              <span>Azienda</span>
            </button>
            <button type="button" className="auth-tipo-btn" onClick={() => setTipo("officina")}>
              <i className="fa-solid fa-screwdriver-wrench" />
              <span>Officina</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="auth-step">
          <button
            type="button"
            className="auth-back-step"
            onClick={() => {
              setTipo(null);
              setErrore("");
            }}
          >
            <i className="fa-solid fa-arrow-left" /> Indietro
          </button>

          <form onSubmit={(e) => void registra(e)}>
            {tipo === "privato" && (
              <div className="auth-form">
                <div className="input-group">
                  <i className="fa-solid fa-user" />
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <i className="fa-solid fa-envelope" />
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <i className="fa-solid fa-lock" />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            )}

            {tipo === "azienda" && (
              <div className="auth-form">
                <div className="input-group">
                  <i className="fa-solid fa-user" />
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <i className="fa-solid fa-envelope" />
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <i className="fa-solid fa-lock" />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <i className="fa-solid fa-building" />
                  <input
                    type="text"
                    placeholder="Ragione Sociale"
                    value={ragioneSociale}
                    onChange={(e) => setRagioneSociale(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <i className="fa-solid fa-file-invoice" />
                  <input
                    type="text"
                    placeholder="Partita IVA"
                    value={partitaIva}
                    onChange={(e) => setPartitaIva(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <i className="fa-solid fa-file-invoice" />
                  <input
                    type="text"
                    placeholder="Codice SDI (opzionale)"
                    value={codiceSdi}
                    onChange={(e) => setCodiceSdi(e.target.value)}
                  />
                </div>
              </div>
            )}

            {tipo === "officina" && (
              <div className="auth-form">
                <div className="input-group">
                  <i className="fa-solid fa-envelope" />
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <i className="fa-solid fa-lock" />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <i className="fa-solid fa-store" />
                  <input
                    type="text"
                    placeholder="Nome Officina"
                    value={nomeOfficina}
                    onChange={(e) => setNomeOfficina(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <i className="fa-solid fa-building" />
                  <input
                    type="text"
                    placeholder="Ragione Sociale"
                    value={ragioneSociale}
                    onChange={(e) => setRagioneSociale(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <i className="fa-solid fa-file-invoice" />
                  <input
                    type="text"
                    placeholder="Partita IVA"
                    value={partitaIva}
                    onChange={(e) => setPartitaIva(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <i className="fa-solid fa-file-invoice" />
                  <input
                    type="text"
                    placeholder="Codice SDI (opzionale)"
                    value={codiceSdi}
                    onChange={(e) => setCodiceSdi(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <i className="fa-solid fa-phone" />
                  <input
                    type="text"
                    placeholder="Telefono"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <i className="fa-solid fa-location-dot" />
                  <input
                    type="text"
                    placeholder="Indirizzo"
                    value={indirizzo}
                    onChange={(e) => setIndirizzo(e.target.value)}
                  />
                </div>
                <div className="input-group" style={{ position: "relative" }}>
                  <i className="fa-solid fa-city" />
                  <input
                    type="text"
                    placeholder="Città (es. Milano)"
                    autoComplete="off"
                    value={cittaInput}
                    onChange={(e) => void onCercaCitta(e.target.value)}
                  />
                  <div className={`citta-dropdown${suggerimentiCitta.length > 0 ? " open" : ""}`}>
                    {suggerimentiCitta.map((c) => (
                      <div key={c.sigla} className="citta-option" onClick={() => selezionaCitta(c)}>
                        <span>{c.sigla}</span>
                        {c.nome}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <p className="auth-error">{errore}</p>
            <button
              type="submit"
              className="btn-landing btn-register"
              style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
              disabled={inCorso}
            >
              <i className="fa-solid fa-user-plus" /> REGISTRATI
            </button>
          </form>
        </div>
      )}

      <p className="auth-switch">
        Hai già un account? <Link href="/login">Accedi</Link>
      </p>
    </AuthShell>
  );
}
