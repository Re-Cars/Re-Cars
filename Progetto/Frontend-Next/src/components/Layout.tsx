"use client";

import { useState, type ReactNode } from "react";

import Assistente from "./assistente/Assistente";
import BreadCrumb from "./BreadCrumb";
import Header from "./Header";
import Sidebar from "./Sidebar";

interface LayoutProps {
  children: ReactNode;
  /** Etichetta breadcrumb; se assente il breadcrumb non viene mostrato (es. homepage). */
  breadcrumb?: string;
}

/**
 * Layout comune delle pagine autenticate: Sidebar + Header + Breadcrumb
 * e l'assistente AI (bottone flottante in basso a destra). Il limite di
 * veicoli del piano è segnalato dentro "Aggiungi veicolo". Il veicolo attivo non
 * ha più uno switcher globale: le pagine che ne usano uno mostrano
 * VeicoloPicker nel proprio hero.
 */
export default function Layout({
  children,
  breadcrumb,
}: LayoutProps) {
  const [sidebarAperta, setSidebarAperta] = useState(false);

  return (
    <>
      <Sidebar
        aperta={sidebarAperta}
        onToggle={() => setSidebarAperta((v) => !v)}
        onClose={() => setSidebarAperta(false)}
      />
      <Header />
      {breadcrumb && <BreadCrumb pagina={breadcrumb} />}

      {children}

      <Assistente />
    </>
  );
}
