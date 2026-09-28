"use client";

import { useEffect } from "react";

import { avviaPwa } from "@/lib/pwa";

/** Registra il service worker e intercetta il prompt di installazione (una volta). */
export default function RegistraServiceWorker() {
  useEffect(() => avviaPwa(), []);
  return null;
}
