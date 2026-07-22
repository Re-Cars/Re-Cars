"use client";

import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { getAvatarSalvato } from "@/lib/storage";

/**
 * Header dell'app: logo RE|CARS animato, toggle dark/light,
 * avatar con dropdown (nome utente, modifica profilo, logout).
 */
export default function Header() {
  const { utente, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [menuAperto, setMenuAperto] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // chiusura del dropdown al click fuori
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setMenuAperto(false);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const avatar = utente?.avatar ?? (mounted ? getAvatarSalvato() : null);
  const nome = utente?.username ?? utente?.ragione_sociale ?? utente?.nome ?? "";
  const isDark = resolvedTheme === "dark";

  return (
    <header className="header">
      <div className="header-left" />
      <div className="header-center">
        <Link href="/homepage">
          <Image
            src="/Img/LOGO/solo-logo-C-e-O/SVG/logotipo.svg"
            alt="logo"
            width={50}
            height={50}
            className="header-logo-img"
          />
          <span className="header-brand">
            RE<span>|</span>CARS
          </span>
        </Link>
      </div>
      <div className="header-right">
        <button
          type="button"
          className="theme-toggle-btn"
          aria-label="Cambia tema"
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          <i className={`fa-solid ${mounted && isDark ? "fa-sun" : "fa-moon"}`} />
        </button>

        <div
          ref={wrapperRef}
          className="header-avatar-wrapper"
          onClick={() => setMenuAperto((v) => !v)}
        >
          <div className="header-avatar">
            {avatar ? (
              /* avatar base64 caricato dall'utente: non ottimizzabile da next/image */
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="avatar" />
            ) : (
              <i className="fa-solid fa-user" />
            )}
          </div>
          <div className={`avatar-dropdown${menuAperto ? " open" : ""}`}>
            <div className="avatar-header">
              <p className="avatar-header-name">
                Ciao, <span>{nome}</span>
              </p>
            </div>
            <Link href="/account" className="avatar-item">
              <i className="fa-solid fa-pen" />
              <span>Modifica profilo</span>
            </Link>
            <button
              type="button"
              className="avatar-item avatar-item-logout"
              onClick={() => void logout()}
            >
              <i className="fa-solid fa-right-from-bracket" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
