"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { useAuth } from "@/context/AuthContext";
import { logoutOfficina } from "@/lib/auth";
import "@/styles/officina.css";

interface BriciolaOfficina {
  label: string;
  href?: string;
}

interface OfficinaLayoutProps {
  children: ReactNode;
  /** Voci del breadcrumb dopo "Dashboard" (es. [{label: "Prenotazioni"}]). */
  briciole?: BriciolaOfficina[];
}

const NAV_OFFICINA = [
  { href: "/officina", icona: "fa-gauge", label: "Dashboard" },
  { href: "/profilo-officina", icona: "fa-building-user", label: "Profilo Officina" },
  { href: "/prenotazioni-officina", icona: "fa-calendar-check", label: "Prenotazioni" },
  { href: "/officina-agenda", icona: "fa-calendar-days", label: "Agenda" },
  { href: "/abbonamenti-officina", icona: "fa-credit-card", label: "Abbonamento" },
] as const;

/**
 * Layout comune delle pagine officina: sidebar dedicata (Dashboard, Profilo,
 * Prenotazioni, Agenda, Abbonamento), header con avatar building-user e
 * logout via POST /officina/logout.
 */
export default function OfficinaLayout({ children, briciole = [] }: OfficinaLayoutProps) {
  const router = useRouter();
  const { utente } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [sidebarAperta, setSidebarAperta] = useState(false);
  const [menuAvatar, setMenuAvatar] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setMenuAvatar(false);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const nome = utente?.nome ?? utente?.ragione_sociale ?? "";
  const isDark = resolvedTheme === "dark";

  const eseguiLogout = async () => {
    await logoutOfficina();
    router.push("/");
  };

  return (
    <>
      <div
        className={`hamburger-overlay${sidebarAperta ? " open" : ""}`}
        onClick={() => setSidebarAperta(false)}
      />
      <div className={`sidebar${sidebarAperta ? " open" : ""}`}>
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
          <div
            className={`hamburger9${sidebarAperta ? " open" : ""}`}
            onClick={() => setSidebarAperta((v) => !v)}
          >
            <span className="line line1" />
            <span className="line line2" />
            <span className="line line3" />
            <span className="line line4" />
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV_OFFICINA.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setSidebarAperta(false)}>
              <i className={`fa-solid ${item.icona}`} /> {item.label}
            </Link>
          ))}
          <button type="button" className="sidebar-logout" onClick={() => void eseguiLogout()}>
            <i className="fa-solid fa-right-from-bracket" /> Logout
          </button>
        </nav>
      </div>

      <header className="header">
        <div className="header-left" />
        <div className="header-center">
          <Link href="/officina">
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
            ref={avatarRef}
            className="header-avatar-wrapper"
            onClick={() => setMenuAvatar((v) => !v)}
          >
            <div className="header-avatar">
              <i className="fa-solid fa-building-user" />
            </div>
            <div className={`avatar-dropdown${menuAvatar ? " open" : ""}`}>
              <div className="avatar-header">
                <p className="avatar-header-name">
                  Ciao, <span>{nome}</span>
                </p>
              </div>
              <Link href="/profilo-officina" className="avatar-item">
                <i className="fa-solid fa-pen" />
                <span>Modifica profilo</span>
              </Link>
              <button
                type="button"
                className="avatar-item avatar-item-logout"
                onClick={() => void eseguiLogout()}
              >
                <i className="fa-solid fa-right-from-bracket" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="breadcrumb">
        <Link href="/officina">
          <i className="fa-solid fa-gauge" /> Dashboard
        </Link>
        {briciole.map((b) => (
          <span key={b.label} style={{ display: "contents" }}>
            <span>›</span>
            {b.href ? <Link href={b.href}>{b.label}</Link> : <span>{b.label}</span>}
          </span>
        ))}
      </div>

      {children}
    </>
  );
}
