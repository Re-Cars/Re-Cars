"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import BrandTitle from "@/components/BrandTitle";

/**
 * Landing page: saracinesca del garage con sequenza animata. Il logo-auto
 * entra da sinistra, frena e si ferma al centro, poi escono RE|CARS, lo
 * slogan e il bottone ACCEDI. Tutta la sequenza è CSS (classe "avvia" in
 * .landing-content, tempi in globals.css): niente timer React, che sul
 * telefono facevano scattare l'animazione. Parte quando lo sfondo è pronto
 * (al massimo dopo 600 ms). "Aprire il garage" (scroll, swipe o click su
 * ACCEDI) solleva la saracinesca e porta alla pagina di login.
 */
export default function LandingPage() {
  const router = useRouter();
  const [avviata, setAvviata] = useState(false);
  const [aperto, setAperto] = useState(false);
  const apertoRef = useRef(false);

  // si parte a sfondo decodificato, così la sfumatura non scatta
  useEffect(() => {
    let fatto = false;
    const avvia = () => {
      if (fatto) return;
      fatto = true;
      setAvviata(true);
    };
    const img = new Image();
    img.src = "/Img/garage-landing.webp";
    img.decode().then(avvia, avvia);
    const riserva = setTimeout(avvia, 600);
    return () => {
      fatto = true;
      clearTimeout(riserva);
    };
  }, []);

  // mentre scorre l'animazione si sveglia il backend (Render gratuito si
  // addormenta: la prima richiesta può metterci decine di secondi) e si
  // prepara la pagina di login, così "Accedi" risponde subito
  useEffect(() => {
    router.prefetch("/login");
    void fetch("/api/", { cache: "no-store" }).catch(() => undefined);
  }, [router]);

  const apriGarage = () => {
    if (apertoRef.current) return;
    apertoRef.current = true;
    setAperto(true);
    // la saracinesca sale, poi si passa al login
    setTimeout(() => router.push("/login"), 650);
  };

  // scroll con la rotellina o swipe verso l'alto aprono il garage
  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      if (apertoRef.current) return;
      const isMouse =
        (event.deltaY % 100 === 0 || event.deltaY % 120 === 0) && Math.abs(event.deltaY) >= 100;
      if (isMouse ? event.deltaY < 0 : event.deltaY > 0) apriGarage();
    };
    let touchStartY = 0;
    const onTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0].clientY;
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (!apertoRef.current && touchStartY - event.changedTouches[0].clientY > 50) apriGarage();
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="auth-body">
      <div className="landing-overlay" />
      <div className={`shutter-gate${avviata ? " show-bg" : ""}${aperto ? " lift-up" : ""}`}>
        <div className="landing-overlay" />
        <div className={`landing-content${avviata ? " avvia" : ""}`}>
          <div className="brand-group">
            <div className="landing-logo" aria-hidden="true">
              <span className="landing-scia">
                <i />
                <i />
                <i />
              </span>
              <svg className="landing-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50.54 35.951">
                <path
                  className="logo-path"
                  d="M44.234,35.083c0,3.957,2.775,5.643,5.032,6.6a7.812,7.812,0,0,0,7.165-.454,7.39,7.39,0,0,0,3.412-6.444v-.035a4.361,4.361,0,0,0-4.361-4.511H17.873a4.347,4.347,0,0,0-4.344,4.511v.035a7.39,7.39,0,0,0,3.412,6.444,7.812,7.812,0,0,0,7.165.454c2.257-.958,5.033-2.941,5.033-6.9,0-6.835-7.881-9.074-7.881-9.074l-3.605-.259a4.046,4.046,0,0,1-4.124-4.017V14.157a4.206,4.206,0,0,1,4.206-4.206H35.569c12.053,1.061,22.167,9.687,23.882,11.023A2.694,2.694,0,0,1,60.5,23.093h0a2.658,2.658,0,0,1-2.657,2.657h-12.8a7.578,7.578,0,0,1-7.578-7.577V15.71"
                  transform="translate(-11.745 -8.17)"
                />
              </svg>
            </div>
            <BrandTitle as="h1" className="landing-brand" animato visibile={avviata} />
            <p className="landing-subtitle">
              <i>Tu guida al resto pensiamo noi</i>
            </p>
          </div>

          <div className="action-group">
            <div className={`scroll-hint${aperto ? " hint-hidden" : ""}`}>
              <span>Scorri</span>
              <div className="scroll-arrows">
                <i className="fa-solid fa-chevron-up" />
                <i className="fa-solid fa-chevron-up" />
                <i className="fa-solid fa-chevron-up" />
              </div>
            </div>
          </div>

          <div className="landing-buttons">
            <button type="button" className="btn-landing" onClick={apriGarage}>
              ACCEDI
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
