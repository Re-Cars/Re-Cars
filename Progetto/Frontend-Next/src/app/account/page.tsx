"use client";

import Cropper from "cropperjs";
import "cropperjs/dist/cropper.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";

import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { aggiornaUtente as apiAggiornaUtente, ApiError, eliminaAccount, getProfiloUtente } from "@/lib/api";
import { clearAll, setAvatarSalvato } from "@/lib/storage";
import type { ProfiloUtente } from "@/lib/types";

type CampoModificabile = "username" | "email" | "cellulare" | "password";

const CONFIG_CAMPI: Record<
  CampoModificabile,
  { icona: string; titolo: string; placeholder: string; type: string }
> = {
  username: { icona: "fa-user", titolo: "Cambia username", placeholder: "Nuovo username", type: "text" },
  email: { icona: "fa-envelope", titolo: "Cambia email", placeholder: "Nuova email", type: "email" },
  cellulare: { icona: "fa-phone", titolo: "Numero di telefono", placeholder: "Es. 3331234567", type: "tel" },
  password: { icona: "fa-key", titolo: "Cambia password", placeholder: "Nuova password", type: "password" },
};

const NOMI_PIANI: Record<string, string> = { base: "Base", premium: "Premium", pro: "Pro" };

/**
 * Il mio account: profilo con avatar (upload + crop), dati account con
 * modifica inline, abbonamento attivo e zona pericolosa.
 */
export default function AccountPage() {
  const router = useRouter();
  const { utente, aggiornaUtente, gestisci401 } = useAuth();

  const [profilo, setProfilo] = useState<ProfiloUtente | null>(null);
  const [campoInModifica, setCampoInModifica] = useState<CampoModificabile | null>(null);
  const [valoreCampo, setValoreCampo] = useState("");
  const [erroreCampo, setErroreCampo] = useState("");
  const [confermaElimina, setConfermaElimina] = useState(false);
  const [immagineDaRitagliare, setImmagineDaRitagliare] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropperImgRef = useRef<HTMLImageElement>(null);
  const cropperRef = useRef<Cropper | null>(null);

  const caricaProfilo = useCallback(async () => {
    if (!utente) return;
    try {
      const data = await getProfiloUtente(utente.id);
      setProfilo(data);
      if (data.avatar) setAvatarSalvato(data.avatar);
    } catch (err) {
      if (!gestisci401(err)) console.error("Errore nel caricamento dati account", err);
    }
  }, [utente, gestisci401]);

  useEffect(() => {
    void caricaProfilo();
  }, [caricaProfilo]);

  // inizializza Cropper.js quando si apre l'overlay di ritaglio
  useEffect(() => {
    if (!immagineDaRitagliare || !cropperImgRef.current) return;
    const cropper = new Cropper(cropperImgRef.current, {
      aspectRatio: 1,
      viewMode: 1,
      dragMode: "move",
      cropBoxMovable: true,
      cropBoxResizable: true,
      autoCropArea: 0.8,
      background: false,
      guides: false,
      center: true,
      highlight: false,
    });
    cropperRef.current = cropper;
    return () => {
      cropper.destroy();
      cropperRef.current = null;
    };
  }, [immagineDaRitagliare]);

  const onFileSelezionato = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Immagine troppo grande. Massimo 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setImmagineDaRitagliare(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const confermaCrop = async () => {
    const cropper = cropperRef.current;
    if (!cropper || !utente) return;
    const base64 = cropper
      .getCroppedCanvas({ width: 256, height: 256 })
      .toDataURL("image/jpeg", 0.85);
    setImmagineDaRitagliare(null);

    setProfilo((p) => (p ? { ...p, avatar: base64 } : p));
    aggiornaUtente({ ...utente, avatar: base64 });
    setAvatarSalvato(base64);

    try {
      await apiAggiornaUtente(utente.id, { avatar: base64 });
    } catch (err) {
      console.error("Errore salvataggio avatar:", err);
    }
  };

  const apriModifica = (campo: CampoModificabile) => {
    setCampoInModifica(campo);
    setErroreCampo("");
    setValoreCampo(campo === "password" ? "" : String(profilo?.[campo] ?? ""));
  };

  const salvaModifica = async () => {
    if (!campoInModifica || !utente) return;
    const valore = valoreCampo.trim();
    if (!valore) {
      setErroreCampo("Il campo non può essere vuoto");
      return;
    }
    try {
      await apiAggiornaUtente(utente.id, { [campoInModifica]: valore });
      if (campoInModifica === "username") {
        aggiornaUtente({ ...utente, username: valore });
      }
      setCampoInModifica(null);
      await caricaProfilo();
    } catch (err) {
      if (gestisci401(err)) return;
      setErroreCampo(err instanceof ApiError ? err.message : "Errore di connessione al server");
    }
  };

  const confermaEliminaAccount = async () => {
    setConfermaElimina(false);
    if (!utente) return;
    try {
      await eliminaAccount(utente.id);
      clearAll();
      document.cookie = "rc_session=; path=/; max-age=0";
      router.push("/");
    } catch {
      alert("Errore durante l'eliminazione dell'account.");
    }
  };

  const abbonamento = profilo?.abbonamento?.[0];
  const piano = abbonamento?.piano ?? "base";
  const sottotitoloPiano = abbonamento?.data_fine
    ? `Rinnovo il ${new Date(abbonamento.data_fine).toLocaleDateString("it-IT")}`
    : piano === "base"
      ? "Piano gratuito · Nessun rinnovo"
      : "Rinnovo automatico mensile";

  return (
    <Layout breadcrumb="Il mio account">
      <section className="acc-dashboard">
        {/* Profilo */}
        <div className="acc-section-card">
          <div className="acc-section-bar">
            <i className="fa-solid fa-user" />
            <span>Profilo</span>
          </div>
          <div className="acc-section-body">
            <div className="acc-avatar-row">
              <div className="acc-avatar-big">
                {profilo?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profilo.avatar} alt="avatar" />
                ) : (
                  <i className="fa-solid fa-user" />
                )}
                <button
                  type="button"
                  className="acc-avatar-edit"
                  title="Cambia immagine"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <i className="fa-solid fa-camera" />
                  <div className="acc-avatar-plus-badge">
                    <i className="fa-solid fa-plus" />
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={onFileSelezionato}
                />
              </div>
              <div className="acc-avatar-info">
                <p className="acc-avatar-name">{profilo?.username ?? "-"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dati account */}
        <div className="acc-section-card">
          <div className="acc-section-bar">
            <i className="fa-solid fa-id-card" />
            <span>Dati account</span>
          </div>
          <div className="acc-section-body">
            <div className="acc-field-row">
              <div className="acc-field-lbl">
                <span>Username</span>
                <span>{profilo?.username ?? "-"}</span>
              </div>
              <button type="button" className="acc-btn-pill" onClick={() => apriModifica("username")}>
                <div className="acc-icon-circle">
                  <i className="fa-solid fa-pen" />
                </div>
                Modifica
              </button>
            </div>
            <div className="acc-field-row">
              <div className="acc-field-lbl">
                <span>Email</span>
                <span>{profilo?.email ?? "-"}</span>
              </div>
              <button type="button" className="acc-btn-pill" onClick={() => apriModifica("email")}>
                <div className="acc-icon-circle">
                  <i className="fa-solid fa-pen" />
                </div>
                Modifica
              </button>
            </div>
            <div className="acc-field-row">
              <div className="acc-field-lbl">
                <span>Telefono</span>
                <span>{profilo?.cellulare ?? "Non impostato"}</span>
              </div>
              <button type="button" className="acc-btn-pill" onClick={() => apriModifica("cellulare")}>
                <div className="acc-icon-circle">
                  <i className={`fa-solid ${profilo?.cellulare ? "fa-pen" : "fa-plus"}`} />
                </div>
                {profilo?.cellulare ? "Modifica" : "Aggiungi"}
              </button>
            </div>
            <div className="acc-field-row">
              <div className="acc-field-lbl">
                <span>Password</span>
                <span>••••••••</span>
              </div>
              <button type="button" className="acc-btn-pill" onClick={() => apriModifica("password")}>
                <div className="acc-icon-circle">
                  <i className="fa-solid fa-key" />
                </div>
                Cambia
              </button>
            </div>
          </div>
        </div>

        {/* Abbonamento */}
        <div className="acc-section-card">
          <div className="acc-section-bar">
            <i className="fa-solid fa-credit-card" />
            <span>Abbonamento</span>
          </div>
          <div className="acc-section-body">
            <div className="acc-piano-row">
              <div className="acc-piano-info">
                <span className="acc-piano-label">Piano attivo</span>
                <span className="acc-piano-nome">{NOMI_PIANI[piano] ?? piano}</span>
                <span className="acc-piano-sub">{sottotitoloPiano}</span>
              </div>
              <span className="acc-piano-stato">
                <span className="acc-piano-stato-dot" />
                Attivo
              </span>
            </div>
            <Link href="/abbonamenti" className="acc-btn-pill acc-btn-gestisci">
              <div className="acc-icon-circle">
                <i className="fa-solid fa-arrow-right" />
              </div>
              Gestisci abbonamento
            </Link>
          </div>
        </div>

        {/* Zona pericolosa */}
        <div className="acc-section-card acc-danger-card">
          <div className="acc-section-bar acc-danger-bar">
            <i className="fa-solid fa-triangle-exclamation" />
            <span>Zona pericolosa</span>
          </div>
          <div className="acc-section-body">
            <div className="acc-danger-row">
              <div className="acc-danger-text">
                <p>Elimina account</p>
                <p>Questa azione è irreversibile. Tutti i tuoi dati verranno eliminati permanentemente.</p>
              </div>
              <button
                type="button"
                className="acc-btn-pill-danger"
                onClick={() => setConfermaElimina(true)}
              >
                <div className="acc-icon-circle-danger">
                  <i className="fa-solid fa-trash" />
                </div>
                Elimina
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Overlay modifica campo */}
      {campoInModifica && (
        <div className="modifica-campo-overlay" onClick={() => setCampoInModifica(null)}>
          <div className="modifica-campo-box" onClick={(e) => e.stopPropagation()}>
            <p className="modifica-campo-title">
              <i className={`fa-solid ${CONFIG_CAMPI[campoInModifica].icona}`} />{" "}
              {CONFIG_CAMPI[campoInModifica].titolo}
            </p>
            <input
              type={CONFIG_CAMPI[campoInModifica].type}
              placeholder={CONFIG_CAMPI[campoInModifica].placeholder}
              value={valoreCampo}
              autoFocus
              onChange={(e) => setValoreCampo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void salvaModifica();
              }}
            />
            <p className="modifica-campo-error">{erroreCampo}</p>
            <div className="modifica-campo-btns">
              <button type="button" className="btn-annulla" onClick={() => setCampoInModifica(null)}>
                Annulla
              </button>
              <button type="button" className="acc-btn-pill" onClick={() => void salvaModifica()}>
                <div className="acc-icon-circle">
                  <i className="fa-solid fa-check" />
                </div>
                Salva
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay conferma eliminazione account */}
      {confermaElimina && (
        <div className="conferma-account-overlay" onClick={() => setConfermaElimina(false)}>
          <div className="conferma-account-box" onClick={(e) => e.stopPropagation()}>
            <div className="conferma-account-icon">
              <i className="fa-solid fa-triangle-exclamation" />
            </div>
            <p className="conferma-account-title">Elimina account</p>
            <p className="conferma-account-sub">
              Questa azione è irreversibile. Tutti i tuoi dati, veicoli e prenotazioni verranno
              eliminati permanentemente.
            </p>
            <div className="conferma-account-btns">
              <button type="button" className="btn-annulla" onClick={() => setConfermaElimina(false)}>
                Annulla
              </button>
              <button
                type="button"
                className="acc-btn-pill-danger"
                onClick={() => void confermaEliminaAccount()}
              >
                <div className="acc-icon-circle-danger">
                  <i className="fa-solid fa-trash" />
                </div>
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay cropper avatar */}
      {immagineDaRitagliare && (
        <div className="cropper-overlay">
          <div className="cropper-box">
            <p className="cropper-title">
              <i className="fa-solid fa-crop-simple" /> Ritaglia la tua foto
            </p>
            <div className="cropper-area">
              {/* immagine sorgente per Cropper.js, non gestibile con next/image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img ref={cropperImgRef} src={immagineDaRitagliare} alt="Da ritagliare" />
            </div>
            <div className="cropper-btns">
              <button type="button" className="btn-annulla" onClick={() => setImmagineDaRitagliare(null)}>
                Annulla
              </button>
              <button type="button" className="acc-btn-pill" onClick={() => void confermaCrop()}>
                <div className="acc-icon-circle">
                  <i className="fa-solid fa-check" />
                </div>
                Applica
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
