"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Liste a scorrimento interno (garage in dashboard, prenotazioni): true
 * quando c'è altro contenuto sotto, così la lista sfuma in basso
 * (classe .sfuma). Si ricalcola a ogni scroll, resize e cambio di `chiave`
 * (di solito il numero di elementi mostrati).
 */
export function useSfumaturaScroll<T extends HTMLElement>(chiave: unknown) {
  const ref = useRef<T>(null);
  const [sfuma, setSfuma] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const aggiorna = () =>
      setSfuma(el.scrollHeight > el.clientHeight + 2 && el.scrollTop + el.clientHeight < el.scrollHeight - 4);
    aggiorna();
    el.addEventListener("scroll", aggiorna, { passive: true });
    const ro = new ResizeObserver(aggiorna);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", aggiorna);
      ro.disconnect();
    };
  }, [chiave]);

  return [ref, sfuma] as const;
}
