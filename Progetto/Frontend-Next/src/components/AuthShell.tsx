"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

interface AuthShellProps {
  children: ReactNode;
  /** Link in alto a destra (es. "Registrati" dal login e viceversa). */
  toggleHref: string;
  toggleLabel: string;
  toggleIcona: string;
}

/**
 * Guscio glassmorphism delle pagine di autenticazione: sfondo garage,
 * container in vetro con barra arancione, freccia indietro, toggle
 * login/registrazione e logo RE|CARS.
 */
export default function AuthShell({ children, toggleHref, toggleLabel, toggleIcona }: AuthShellProps) {
  return (
    <div className="auth-body">
      <div className="landing-overlay" />
      <div className="auth-container" style={{ display: "flex" }}>
        <div className="auth-scroll">
          <div className="auth-nav">
            <Link href="/" className="auth-back" aria-label="Torna alla landing">
              <i className="fa-solid fa-arrow-left" />
            </Link>
            <div className="auth-toggle-slot">
              <Link href={toggleHref} className="auth-toggle-nav">
                <i className={`fa-solid ${toggleIcona}`} />
                <span>{toggleLabel}</span>
              </Link>
            </div>
          </div>

          <div className="auth-logo">
            <Image
              src="/Img/LOGO/solo-logo-C-e-O/SVG/logotipo.svg"
              alt="Logo RE|CARS"
              width={80}
              height={80}
              className="auth-logo-img"
            />
            <h1 className="landing-title2">RE|CARS</h1>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
