"use client";

import Image from "next/image";
import Link from "next/link";

import { useAuth } from "@/context/AuthContext";

interface SidebarProps {
  aperta: boolean;
  onToggle: () => void;
  onClose: () => void;
}

const NAV_ITEMS = [
  { href: "/homepage", icona: "fa-house", label: "Home" },
  { href: "/account", icona: "fa-user", label: "Il mio account" },
  { href: "/veicoli", icona: "fa-car", label: "Veicolo" },
  { href: "/abbonamenti", icona: "fa-credit-card", label: "Abbonamenti" },
  { href: "/info-domande", icona: "fa-circle-info", label: "Info e domande utili" },
  { href: "#top", icona: "fa-envelope", label: "Contatti" },
  { href: "/termini-privacy", icona: "fa-file-shield", label: "Termini e privacy policy" },
] as const;

/** Sidebar a scomparsa con hamburger animato (replica di style-app.css). */
export default function Sidebar({ aperta, onToggle, onClose }: SidebarProps) {
  const { logout } = useAuth();

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
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} onClick={onClose}>
              <i className={`fa-solid ${item.icona}`} /> {item.label}
            </Link>
          ))}
          <button type="button" className="sidebar-logout" onClick={() => void logout()}>
            <i className="fa-solid fa-right-from-bracket" /> Logout
          </button>
        </nav>
      </div>
    </>
  );
}
