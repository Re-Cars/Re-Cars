"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import Layout from "@/components/Layout";
import "@/styles/infodomande.css";

interface Faq {
  domanda: string;
  contenuto: ReactNode;
}

function Passi({ passi }: { passi: ReactNode[] }) {
  return (
    <ul className="faq-steps">
      {passi.map((p, i) => (
        <li key={i}>
          <span className="faq-step-num">{i + 1}</span> {p}
        </li>
      ))}
    </ul>
  );
}

function PassiCheck({ passi }: { passi: ReactNode[] }) {
  return (
    <ul className="faq-steps">
      {passi.map((p, i) => (
        <li key={i}>
          <span className="faq-step-num">
            <i className="fa-solid fa-check faq-step-ico" />
          </span>{" "}
          {p}
        </li>
      ))}
    </ul>
  );
}

const FAQ: Faq[] = [
  {
    domanda: "Perché utilizzare la nostra applicazione tra tante?",
    contenuto: (
      <>
        <p className="faq-text">
          RE|CARS è l&apos;unica app pensata esclusivamente per chi vuole tenere tutto sotto controllo:
          scadenze, interventi, prenotazioni officina e segnalazioni in un unico posto. Niente più
          appunti sparsi o reminder dimenticati.
        </p>
        <div className="faq-pills">
          <span className="faq-pill">
            <i className="fa-solid fa-clock" /> Scadenze sempre sotto controllo
          </span>
          <span className="faq-pill">
            <i className="fa-solid fa-screwdriver-wrench" /> Storico interventi completo
          </span>
          <span className="faq-pill">
            <i className="fa-solid fa-calendar-days" /> Prenotazione officina rapida
          </span>
          <span className="faq-pill">
            <i className="fa-solid fa-star" /> Recensioni verificate
          </span>
        </div>
      </>
    ),
  },
  {
    domanda: "Come avviene l'inserimento del veicolo nel mio garage virtuale?",
    contenuto: (
      <>
        <p className="faq-text">Aggiungere il tuo veicolo è velocissimo. Segui questi passaggi:</p>
        <p className="faq-text">Puoi aggiungere il tuo veicolo dalla homepage:</p>
        <Passi
          passi={[
            "Puoi cliccare sia dal pulsante di ricerca centrale, sia dalla sezione garage in alto a destra.",
            "Dopo aver cliccato, si aprirà la finestra per la ricerca dei veicoli.",
            "Inserisci la targa, cosi che il sistema recupera automaticamente marca, modello e dati tecnici.",
            <span key="4">
              Salva la ricerca o corregila, e per aggiungerla nel tua area conferma cliccando sul
              pulsante <strong>+ Aggiungi al garage</strong>.
            </span>,
            "Il veicolo è salvato e ora potrai accedersi sia dalla HomePage sia dalle impostazione del mio veicolo",
          ]}
        />
        <br />
        <p className="faq-text">Puoi aggiungere il tuo veicolo dal menu:</p>
        <Passi
          passi={[
            <span key="1">
              Vai nella sezione <strong>Veicolo</strong>.
            </span>,
            <span key="2">
              Tocca il pulsante <strong>+ Aggiungi veicolo</strong> in basso centrale che ti porterà
              alla finestra per la ricerca dei veicoli.
            </span>,
            "Inserisci la targa, cosi che il sistema recupera automaticamente marca, modello e dati tecnici.",
            <span key="4">
              Salva la ricerca o corregila, e per aggiungerla nel tua area conferma cliccando sul
              pulsante <strong>+ Aggiungi al garage</strong>.
            </span>,
            "Il veicolo è salvato e ora potrai accederci sia dalla HomePage sia dalle impostazione del mio veicolo",
          ]}
        />
        <div className="faq-note">
          <i className="fa-solid fa-circle-info" /> Puoi inserire dati aggiuntivi come chilometraggio,
          data di acquisto e note personali in qualsiasi momento.
        </div>
      </>
    ),
  },
  {
    domanda: "Come cancello la registrazione del veicolo nella mia area?",
    contenuto: (
      <>
        <p className="faq-text">Puoi rimuovere un veicolo dal tuo garage in pochi tocchi:</p>
        <Passi
          passi={[
            "Apri il menu del garage dalla barra in alto a destra (icona magazzino).",
            "Individua il veicolo da eliminare nell'elenco.",
            <span key="3">
              Tocca l&apos;icona del cestino <i className="fa-solid fa-trash faq-inline-icon" /> accanto
              al veicolo.
            </span>,
            "Conferma la rimozione nella finestra di dialogo.",
          ]}
        />
        <p className="faq-text">Oppure:</p>
        <Passi
          passi={[
            "Apri il menu a sinitra e clicca sulla voce veicolo.",
            "Individua il veicolo da eliminare nell'elenco.",
            <span key="3">
              Tocca l&apos;icona del cestino <i className="fa-solid fa-trash faq-inline-icon" /> accanto
              al veicolo.
            </span>,
            "Conferma la rimozione nella finestra di dialogo.",
          ]}
        />
        <div className="faq-note faq-note--warn">
          <i className="fa-solid fa-triangle-exclamation" /> <strong> ATTENZIONE !</strong>
          L&apos;eliminazione è permanente: tutto lo storico interventi e le scadenze associate al
          veicolo verranno rimossi.
        </div>
      </>
    ),
  },
  {
    domanda: "Quanti veicoli posso registrare?",
    contenuto: (
      <>
        <p className="faq-text">Dipende dal piano che hai attivo:</p>
        <div className="plan-grid">
          <p className="faq-text">
            Puoi visionare l&apos;abbonamento sia dall&apos;area{" "}
            <Link href="/abbonamenti">
              <strong>abbonamenti</strong>
            </Link>
            , sia dal{" "}
            <Link href="/account">
              <strong>il mio account</strong>
            </Link>
            .
          </p>
          <p className="faq-text">
            In ogni caso, appena tenti di salvare un veicolo in più dal piano che hai attivo, ti
            rimanda alla sezione abbonamento.
          </p>
        </div>
      </>
    ),
  },
  {
    domanda: "Cosa offre il piano gratuito?",
    contenuto: (
      <>
        <p className="faq-text">
          Con il piano gratuito puoi iniziare subito a gestire il tuo veicolo senza costi:
        </p>
        <PassiCheck
          passi={[
            <span key="1">
              Registrazione di <strong>1 veicolo</strong>
            </span>,
            <span key="2">
              Monitoraggio delle <strong>scadenze principali</strong> (bollo, assicurazione, revisione)
            </span>,
            <span key="3">
              Inserimento manuale dello <strong>storico interventi</strong>
            </span>,
            "Segnalazione problemi di base",
          ]}
        />
        <div className="faq-note">
          <i className="fa-solid fa-circle-info" /> Per sbloccare prenotazioni officina, più veicoli e
          funzioni avanzate, passa ad un nuovo piano in abbonamento dalla sezione{" "}
          <Link href="/abbonamenti">
            <strong>Abbonamenti</strong>
          </Link>
          .{" "}
          <i>
            Per ulteriori informazioni clicca su{" "}
            <Link href="/abbonamenti">
              <strong>abbonamenti</strong>
            </Link>
          </i>
        </div>
      </>
    ),
  },
  {
    domanda: "Gli abbonamenti come funzionano? e Procedura",
    contenuto: (
      <>
        <p className="faq-text">
          Gli abbonamenti si attivano e rinnovano automaticamente su base mensile. La procedura è
          semplice:
        </p>
        <Passi
          passi={[
            <span key="1">
              Vai su <strong>Abbonamenti</strong> nel menu laterale.
            </span>,
            "Scegli il piano più adatto alle tue esigenze.",
            "Inserisci i dati di pagamento e conferma.",
            "Le funzioni premium si attivano immediatamente.",
          ]}
        />
        <div className="faq-note">
          <i className="fa-solid fa-credit-card" /> Puoi annullare o cambiare piano in qualsiasi
          momento dalla sezione <strong>Abbonamenti</strong>, senza penali.
          <br />
          Inoltre Il pagamento è gestito in modo sicuro da Stripe. Non conserviamo i dati della tua
          carta. Disdici in qualsiasi momento.
        </div>
        <div className="faq-note">
          <i className="fa-solid fa-circle-info" /> Per altre informazione contatta{" "}
          <strong>@mail.com</strong>.
        </div>
      </>
    ),
  },
  {
    domanda: "Prenotare un'officina per il veicolo? Come fare?",
    contenuto: (
      <>
        <p className="faq-text">Puoi prenotare un&apos;officina convenzionata direttamente dall&apos;app:</p>
        <Passi
          passi={[
            <span key="1">
              Dalla homepage, tocca la card <strong>Prenota Officina</strong>.
            </span>,
            "Scegli il tipo di intervento di cui hai bisogno.",
            "Sfoglia le officine disponibili vicino a te, filtra per valutazione o servizio.",
            "Seleziona data e orario, e conferma la prenotazione.",
            "Riceverai una conferma via notifica e sarà visibile nella cronologia delle prenotazioni.",
          ]}
        />
      </>
    ),
  },
  {
    domanda: "Segnalare problematiche — come fare",
    contenuto: (
      <>
        <p className="faq-text">
          Se riscontri un problema con l&apos;applicazione, un&apos;officina o un servizio, puoi
          segnalarlo in modo semplice:
        </p>
        <Passi
          passi={[
            <span key="1">
              Dalla homepage, tocca la card <strong> Segnala problema</strong>.
            </span>,
            "Scegli la categoria del problema (tecnico, officina, pagamento, altro).",
            "Descrivi il problema nel campo testo.",
            "Allega eventuali screenshot e invia.",
          ]}
        />
        <div className="faq-note">
          <i className="fa-solid fa-envelope" /> Il team RE|CARS ti risponderà entro 48 ore lavorative
          all&apos;indirizzo email associato al tuo account.
        </div>
      </>
    ),
  },
  {
    domanda: "Annullare l'iscrizione all'applicazione — come fare",
    contenuto: (
      <>
        <p className="faq-text">
          Puoi eliminare il tuo account in qualsiasi momento dalla sezione profilo:
        </p>
        <Passi
          passi={[
            <span key="1">
              Vai su <strong>Il mio account</strong> dal menu laterale.
            </span>,
            <span key="2">
              Scorri fino a <strong>Elimina account</strong> in fondo alla pagina.
            </span>,
            "Leggi le informazioni sulla cancellazione e conferma con la tua password.",
          ]}
        />
        <div className="faq-note faq-note--warn">
          <i className="fa-solid fa-triangle-exclamation" /> L&apos;eliminazione dell&apos;account è
          definitiva: tutti i dati (veicoli, storico, prenotazioni) saranno rimossi in modo permanente
          e non recuperabile.
        </div>
      </>
    ),
  },
  {
    domanda: "Annullare o modificare l'abbonamento — come fare",
    contenuto: (
      <>
        <p className="faq-text">Gestire il tuo abbonamento è semplice e senza vincoli:</p>
        <Passi
          passi={[
            <span key="1">
              Vai nella sezione <strong>Abbonamenti</strong> dal menu laterale.
            </span>,
            "Visualizza il piano attivo e le opzioni disponibili.",
            <span key="3">
              Scegli <strong>Cambia piano</strong> per passare a un piano diverso, oppure{" "}
              <strong>Annulla abbonamento</strong> per disattivarlo.
            </span>,
            "Conferma la scelta. Il piano resterà attivo fino alla scadenza del periodo già pagato.",
          ]}
        />
        <div className="faq-note">
          <i className="fa-solid fa-circle-info" /> Nessuna penale per il recesso anticipato. Dopo la
          scadenza tornerai automaticamente al piano gratuito.
          <br />
          <i>
            Per ulteriori informazioni contattare <strong> gmail.com</strong>
          </i>
        </div>
      </>
    ),
  },
];

/** FAQ "Info e domande": accordion con apertura singola (come toggleFaq del vanilla). */
export default function InfoDomandePage() {
  const [aperta, setAperta] = useState<number | null>(null);

  return (
    <Layout breadcrumb="Info e domande" mostraSwitcher={false}>
      <h6 className="sotto-title">Info e domande</h6>
      <p className="page-sub">
        Hai bisogno di aiuto per comprendere meglio l&apos;applicazione? Clicca sulle possibili domande
      </p>

      <section className="faq-accordion">
        {FAQ.map((faq, i) => (
          <div key={i} className={`faq-row${i === FAQ.length - 1 ? " faq-row--last" : ""}`}>
            <button
              type="button"
              className={`faq-trigger${aperta === i ? " open" : ""}`}
              onClick={() => setAperta(aperta === i ? null : i)}
            >
              <span className="faq-dash">
                <i className="fa-solid fa-plus" />
              </span>
              <span className="faq-label">{faq.domanda}</span>
              <i className="fa-solid fa-chevron-down faq-arrow" />
            </button>
            <div className={`faq-body${aperta === i ? " open" : ""}`}>{faq.contenuto}</div>
          </div>
        ))}
      </section>
    </Layout>
  );
}
