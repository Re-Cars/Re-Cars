"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { getAbbonamento } from "@/lib/api";

/**
 * Piani utente: Gratis ("base") e Premium. Stessa regola del backend
 * (src/piano.ts): il vecchio "pro" e i piani azienda contano come Premium.
 * Il backend blocca comunque le funzioni Premium che passano da lui; qui
 * serve a mostrare il lucchetto invece di un errore.
 */
export type Piano = "base" | "premium";

export function pianoDa(nome: string | null | undefined): Piano {
  return nome && nome !== "base" && !nome.startsWith("officina") ? "premium" : "base";
}

/** Nome da mostrare: "Gratis" o "Premium" (anche per i vecchi piani). */
export function nomePiano(nome: string | null | undefined): string {
  return pianoDa(nome) === "premium" ? "Premium" : "Gratis";
}

// un solo caricamento per utente e per sessione della pagina
const cache = new Map<number, Promise<Piano>>();

/** Da chiamare dopo un cambio di piano (checkout, disdetta). */
export function dimenticaPiano(idUtente: number): void {
  cache.delete(idUtente);
}

export function usePiano(): { piano: Piano | null; premium: boolean } {
  const { utente } = useAuth();
  const [piano, setPiano] = useState<Piano | null>(null);

  useEffect(() => {
    if (!utente) return;
    let annullato = false;
    let richiesta = cache.get(utente.id);
    if (!richiesta) {
      richiesta = getAbbonamento(utente.id)
        .then((p) => pianoDa(p.abbonamento?.[0]?.piano))
        .catch(() => {
          cache.delete(utente.id);
          return pianoDa(utente.piano);
        });
      cache.set(utente.id, richiesta);
    }
    void richiesta.then((p) => {
      if (!annullato) setPiano(p);
    });
    return () => {
      annullato = true;
    };
  }, [utente]);

  return { piano, premium: piano === "premium" };
}
