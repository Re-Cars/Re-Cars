"use client";

import { useCallback, type MouseEvent } from "react";

/** Rotazione massima (gradi) quando il cursore è sul bordo della card. */
const MAX_GRADI = 8;
const SCALA = 1.03;

/**
 * Tilt 3D verso il cursore, come le card della pagina abbonamenti
 * (onTilt/resetTilt, a loro volta replica di initTiltCards in
 * functions-base.js): posizione del mouse relativa al centro della card →
 * rotateX/rotateY con perspective 1000px e scala 1.03. Transizione 100ms
 * ease-out durante il movimento, 300ms ease-out al rientro.
 *
 * Le transizioni di border-color/background restano nella stringa inline
 * perché `style.transition` sovrascrive per intero quella del CSS.
 */
export function useTilt<T extends HTMLElement>() {
  const onMouseMove = useCallback((e: MouseEvent<T>) => {
    const card = e.currentTarget;
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const rotX = ((0.5 - py) * 2 * MAX_GRADI).toFixed(2);
    const rotY = ((px - 0.5) * 2 * MAX_GRADI).toFixed(2);
    card.style.transition =
      "transform 100ms ease-out, border-color 0.3s ease, background-color 0.3s ease";
    card.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${SCALA})`;
  }, []);

  const onMouseLeave = useCallback((e: MouseEvent<T>) => {
    const card = e.currentTarget;
    card.style.transition =
      "transform 300ms ease-out, border-color 0.3s ease, background-color 0.3s ease";
    card.style.transform = "";
  }, []);

  return { onMouseMove, onMouseLeave };
}
