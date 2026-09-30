"use client";

import { useEffect } from "react";

/**
 * Pagina ferma come un'app (come in Kilo): Safari su iPhone ignora
 * `user-scalable=no` del viewport, quindi lo zoom con due dita si blocca
 * annullando i gesti di pinch. Lo scorrimento con un dito resta normale.
 */
export default function GestiApp() {
  useEffect(() => {
    const annulla = (e: Event) => e.preventDefault();
    const pinch = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener("gesturestart", annulla);
    document.addEventListener("gesturechange", annulla);
    document.addEventListener("touchmove", pinch, { passive: false });
    return () => {
      document.removeEventListener("gesturestart", annulla);
      document.removeEventListener("gesturechange", annulla);
      document.removeEventListener("touchmove", pinch);
    };
  }, []);
  return null;
}
