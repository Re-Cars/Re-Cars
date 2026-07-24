"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment } from "react";

import { useAuth } from "@/context/AuthContext";

interface SidebarProps {
  aperta: boolean;
  onToggle: () => void;
  onClose: () => void;
}

interface VoceNav {
  href: string;
  icona: string;
  label: string;
  /** Separatore visivo prima della voce. */
  separatorePrima?: boolean;
}

/**
 * Voci di navigazione. Corrispondenze con le card azione della homepage
 * (AzioniRapide.tsx), da tenere allineate a mano:
 * - "Storico interventi" ↔ card "Storico interventi" → /storico-interventi
 * - "Prenotazioni" ↔ card "Prenota officina" → /prenotazioni
 * - le card veicolo e la card "Scheda tecnica" → /info-veicolo
 */
const NAV_ITEMS: VoceNav[] = [
  { href: "/homepage", icona: "ti-home", label: "Home" },
  // "Lista veicoli" ha un handler dedicato: scroll/espansione garage (vedi sotto)
  { href: "/storico-interventi", icona: "ti-history", label: "Storico interventi", separatorePrima: true },
  { href: "/prenotazioni", icona: "ti-calendar", label: "Prenotazioni" },
  { href: "/info-domande", icona: "ti-help-circle", label: "Info e domande", separatorePrima: true },
  // "#top" come nel frontend vanilla: non esiste (ancora) una pagina contatti
  { href: "#top", icona: "ti-mail", label: "Contatti" },
  { href: "/termini-privacy", icona: "ti-file-text", label: "Termini e privacy" },
];

/** Sidebar a scomparsa con hamburger animato (replica di style-app.css). */
export default function Sidebar({ aperta, onToggle, onClose }: SidebarProps) {
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // "Lista veicoli": porta alla sezione garage della homepage; se si è già
  // sulla homepage scrolla alla griglia e la espande via evento custom
  const vaiAlGarage = () => {
    onClose();
    if (pathname === "/homepage") {
      window.dispatchEvent(new Event("recars:apri-garage"));
    } else {
      router.push("/homepage#garage");
    }
  };

  return (
    <>
      <div className={`hamburger-overlay${aperta ? " open" : ""}`} onClick={onClose} />
      <div className={`sidebar${aperta ? " open" : ""}`}>
        <div className="sidebar-header">
          <Image
            src="/Img/LOGO/solo-logo-C-e-O/SVG/logotipo.svg"
            alt="logo"
            width={40}
            height={40}
            className="sidebar-logo-img"
          />
          <span className="sidebar-brand">
            RE<span>|</span>CARS
          </span>
          <div className={`hamburger9${aperta ? " open" : ""}`} onClick={onToggle}>
            <span className="line line1" />
            <span className="line line2" />
            <span className="line line3" />
            <span className="line line4" />
          </div>
        </div>

        <nav className="sidebar-nav">
          <Link
            href="/homepage"
            className={pathname === "/homepage" ? "attiva" : undefined}
            onClick={onClose}
          >
            <i className="ti ti-home" /> Home
          </Link>

          <button type="button" onClick={vaiAlGarage}>
            <i className="ti ti-car" /> Lista veicoli
          </button>

          {NAV_ITEMS.slice(1).map((item) => (
            <Fragment key={item.href}>
              {item.separatorePrima && <div className="sidebar-sep" />}
              <Link
                href={item.href}
                className={pathname === item.href ? "attiva" : undefined}
                onClick={onClose}
              >
                <i className={`ti ${item.icona}`} /> {item.label}
              </Link>
            </Fragment>
          ))}

          <button type="button" className="sidebar-logout" onClick={() => void logout()}>
            <i className="ti ti-logout" /> Logout
          </button>
        </nav>
      </div>
    </>
  );
}
