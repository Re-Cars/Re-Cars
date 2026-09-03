"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import BreadCrumb from "./BreadCrumb";
import Header from "./Header";
import Sidebar from "./Sidebar";
import VeicoloSwitcher from "./VeicoloSwitcher";
import { consumaGarageLimiteRaggiunto } from "@/lib/storage";

interface LayoutProps {
  children: ReactNode;
  /** Etichetta breadcrumb; se assente il breadcrumb non viene mostrato (es. homepage). */
  breadcrumb?: string;
  /** Mostra il pill veicolo attivo + switcher garage (default true). */
  mostraSwitcher?: boolean;
  /** Su homepage il pill fluttua sopra le card circolari. */
  switcherFloating?: boolean;
}

/**
 * Layout comune delle pagine autenticate: Sidebar + Header + Breadcrumb +
 * VeicoloSwitcher, più il banner "limite veicoli del piano raggiunto".
 */
export default function Layout({
  children,
  breadcrumb,
  mostraSwitcher = true,
  switcherFloating = false,
}: LayoutProps) {
  const [sidebarAperta, setSidebarAperta] = useState(false);
  const [bannerLimite, setBannerLimite] = useState(false);

  // flag one-shot impostato da cerca-veicolo quando il backend risponde 403
  useEffect(() => {
    if (consumaGarageLimiteRaggiunto()) {
      setBannerLimite(true);
      const timer = setTimeout(() => setBannerLimite(false), 6000);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <>
      <Sidebar
        aperta={sidebarAperta}
        onToggle={() => setSidebarAperta((v) => !v)}
        onClose={() => setSidebarAperta(false)}
      />
      <Header />
      {breadcrumb && <BreadCrumb pagina={breadcrumb} />}
      {mostraSwitcher && <VeicoloSwitcher floating={switcherFloating} />}

      {bannerLimite && (
        <div className="banner-limite-veicoli">
          <div className="banner-limite-content">
            <i className="fa-solid fa-triangle-exclamation" />
            <span>
              Hai raggiunto il limite di veicoli del tuo piano.{" "}
              <Link href="/abbonamenti">Passa a un piano superiore</Link> per aggiungerne altri.
            </span>
            <button type="button" onClick={() => setBannerLimite(false)}>
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        </div>
      )}

      {children}
    </>
  );
}
