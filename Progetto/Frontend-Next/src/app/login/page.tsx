"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import AuthShell from "@/components/AuthShell";
import { useAuth } from "@/context/AuthContext";
import { ApiError, loginAzienda, loginOfficina, loginUtente, logApiError } from "@/lib/api";

type StepLogin = "tipo" | "utente" | "business";
type TipoBusiness = "azienda" | "officina" | null;

/** Login a step: scelta Utente/Business, poi form dedicato (come landing.html). */
export default function LoginPage() {
  const router = useRouter();
  const { aggiornaUtente, caricaVeicoli } = useAuth();

  const [step, setStep] = useState<StepLogin>("tipo");
  const [tipoBusiness, setTipoBusiness] = useState<TipoBusiness>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [piva, setPiva] = useState("");
  const [passwordBusiness, setPasswordBusiness] = useState("");
  const [errore, setErrore] = useState("");
  const [erroreBusiness, setErroreBusiness] = useState("");
  const [inCorso, setInCorso] = useState(false);

  const tornaATipo = () => {
    setStep("tipo");
    setTipoBusiness(null);
    setErrore("");
    setErroreBusiness("");
  };

  const submitUtente = async (e: FormEvent) => {
    e.preventDefault();
    if (inCorso) return;
    setInCorso(true);
    setErrore("");
    try {
      const data = await loginUtente(email.trim(), password);
      aggiornaUtente(data.utente);
      await caricaVeicoli();
      router.push("/homepage");
    } catch (err) {
      logApiError("login utente", err);
      setErrore(err instanceof ApiError ? err.message : "Errore di connessione al server");
    } finally {
      setInCorso(false);
    }
  };

  const submitBusiness = async (e: FormEvent) => {
    e.preventDefault();
    if (inCorso) return;
    if (!tipoBusiness) {
      setErroreBusiness("Seleziona se sei Azienda o Officina");
      return;
    }
    setInCorso(true);
    setErroreBusiness("");
    try {
      if (tipoBusiness === "officina") {
        const data = await loginOfficina(piva.trim(), passwordBusiness);
        aggiornaUtente(data.officina);
        router.push("/officina");
      } else {
        const data = await loginAzienda(piva.trim(), passwordBusiness);
        aggiornaUtente(data.utente);
        await caricaVeicoli();
        router.push("/homepage");
      }
    } catch (err) {
      logApiError("login business", err);
      setErroreBusiness(err instanceof ApiError ? err.message : "Errore di connessione al server");
    } finally {
      setInCorso(false);
    }
  };

  return (
    <AuthShell toggleHref="/registrazione" toggleLabel="Registrati" toggleIcona="fa-user-plus">
      {step === "tipo" && (
        <div className="auth-step">
          <div className="auth-tipo-group">
            <button type="button" className="auth-tipo-btn" onClick={() => setStep("utente")}>
              <i className="fa-solid fa-user" />
              <span>Utente</span>
            </button>
            <button type="button" className="auth-tipo-btn" onClick={() => setStep("business")}>
              <i className="fa-solid fa-building" />
              <span>Business</span>
            </button>
          </div>
        </div>
      )}

      {step === "utente" && (
        <div className="auth-step">
          <button type="button" className="auth-back-step" onClick={tornaATipo}>
            <i className="fa-solid fa-arrow-left" /> Indietro
          </button>
          <form className="auth-form" onSubmit={(e) => void submitUtente(e)}>
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
            <p className="auth-error">{errore}</p>
            <button type="submit" className="btn-landing btn-login" disabled={inCorso}>
              <i className="fa-solid fa-right-to-bracket" /> ACCEDI
            </button>
          </form>
        </div>
      )}

      {step === "business" && (
        <div className="auth-step">
          <button type="button" className="auth-back-step" onClick={tornaATipo}>
            <i className="fa-solid fa-arrow-left" /> Indietro
          </button>
          <div className="auth-tipo-group" style={{ marginBottom: 16 }}>
            <button
              type="button"
              className={`auth-tipo-btn${tipoBusiness === "azienda" ? " selected" : ""}`}
              onClick={() => setTipoBusiness("azienda")}
            >
              <i className="fa-solid fa-briefcase" />
              <span>Azienda</span>
            </button>
            <button
              type="button"
              className={`auth-tipo-btn${tipoBusiness === "officina" ? " selected" : ""}`}
              onClick={() => setTipoBusiness("officina")}
            >
              <i className="fa-solid fa-screwdriver-wrench" />
              <span>Officina</span>
            </button>
          </div>
          <form className="auth-form" onSubmit={(e) => void submitBusiness(e)}>
            <div className="input-group">
              <i className="fa-solid fa-file-invoice" />
              <input
                type="text"
                placeholder="Partita IVA"
                value={piva}
                onChange={(e) => setPiva(e.target.value)}
              />
            </div>
            <div className="input-group">
              <i className="fa-solid fa-lock" />
              <input
                type="password"
                placeholder="Password"
                value={passwordBusiness}
                onChange={(e) => setPasswordBusiness(e.target.value)}
              />
            </div>
            <p className="auth-error">{erroreBusiness}</p>
            <button type="submit" className="btn-landing btn-login" disabled={inCorso}>
              <i className="fa-solid fa-right-to-bracket" /> ACCEDI
            </button>
          </form>
        </div>
      )}

      <p className="auth-switch">
        Non hai un account? <Link href="/registrazione">Registrati</Link>
      </p>
    </AuthShell>
  );
}
