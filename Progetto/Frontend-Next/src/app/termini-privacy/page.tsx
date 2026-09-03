"use client";

import Layout from "@/components/Layout";

/** Termini di servizio e privacy policy (contenuto statico dal vanilla). */
export default function TerminiPrivacyPage() {
  return (
    <Layout breadcrumb="Termini e privacy" mostraSwitcher={false}>
      <section className="page-hero">
        <h2 className="section-title-page">termini e privacy police</h2>
        <p>Ultimo aggiornamento: [DATA]</p>
      </section>

      <section className="termini_e_privacy">
        <div className="section">
          <h2>Introduzione</h2>
          <p>
            Questa pagina descrive i Termini di Servizio e la Privacy Policy dell&apos;applicazione{" "}
            <strong>YOUdrive / RECARS</strong>.
          </p>
          <p>L&apos;app consente agli utenti di:</p>
          <ul>
            <li>Gestire informazioni sui propri veicoli</li>
            <li>Annotare manutenzioni e interventi</li>
            <li>Prenotare appuntamenti presso officine o meccanici</li>
            <li>Pubblicare recensioni sui servizi ricevuti</li>
          </ul>
        </div>

        <div className="section">
          <h2>Titolare del Servizio</h2>
          <p>Titolare del trattamento dei dati:</p>
          <div className="highlight">
            <p>
              <strong>[Nome Azienda / Sviluppatore]</strong>
            </p>
            <p>Email: [email]</p>
            <p>Indirizzo: [indirizzo]</p>
          </div>
        </div>

        <div className="section">
          <h2>Dati Raccolti</h2>
          <h3>Dati forniti dall&apos;utente</h3>
          <ul>
            <li>Nome e cognome</li>
            <li>Email</li>
            <li>Numero di telefono (opzionale)</li>
            <li>Dati del veicolo (marca, modello, targa, chilometraggio)</li>
            <li>Note e manutenzioni</li>
            <li>Recensioni pubblicate</li>
          </ul>
          <h3>Dati tecnici</h3>
          <ul>
            <li>Indirizzo IP</li>
            <li>Tipo di dispositivo</li>
            <li>Sistema operativo</li>
            <li>Dati di utilizzo dell&apos;app</li>
          </ul>
        </div>

        <div className="section">
          <h2>Finalità del Trattamento</h2>
          <p>I dati vengono utilizzati per:</p>
          <ul>
            <li>Fornire i servizi dell&apos;app</li>
            <li>Gestire prenotazioni con officine</li>
            <li>Consentire la pubblicazione di recensioni</li>
            <li>Migliorare il servizio</li>
            <li>Garantire sicurezza della piattaforma</li>
          </ul>
        </div>

        <div className="section">
          <h2>Condivisione dei Dati</h2>
          <p>I dati possono essere condivisi con:</p>
          <ul>
            <li>Officine coinvolte negli appuntamenti</li>
            <li>Servizi cloud e hosting</li>
            <li>Strumenti di analisi delle prestazioni</li>
          </ul>
          <p>I dati non vengono venduti a terzi.</p>
        </div>

        <div className="section">
          <h2>Conservazione dei Dati</h2>
          <p>
            I dati vengono conservati per il tempo necessario a fornire il servizio o fino alla
            richiesta di cancellazione dell&apos;utente.
          </p>
        </div>

        <div className="section">
          <h2>Diritti dell&apos;Utente</h2>
          <p>L&apos;utente ha diritto di:</p>
          <ul>
            <li>Accedere ai propri dati</li>
            <li>Richiedere la modifica dei dati</li>
            <li>Richiedere la cancellazione</li>
            <li>Limitare il trattamento</li>
            <li>Richiedere la portabilità dei dati</li>
          </ul>
          <p>
            Per esercitare questi diritti contattare: <strong>[email]</strong>
          </p>
        </div>

        <div className="section">
          <h2>Termini di Servizio</h2>
          <h3>Utilizzo dell&apos;app</h3>
          <p>L&apos;utente si impegna a utilizzare l&apos;applicazione in modo conforme alle leggi vigenti.</p>
          <h3>Prenotazioni officine</h3>
          <p>
            L&apos;app funge da piattaforma per facilitare il contatto tra utenti e officine. Il gestore
            dell&apos;app non è responsabile per i servizi forniti dalle officine.
          </p>
          <h3>Recensioni</h3>
          <p>
            Le recensioni rappresentano opinioni personali degli utenti. Contenuti offensivi, falsi o
            illegali possono essere rimossi.
          </p>
          <h3>Limitazione di responsabilità</h3>
          <p>
            L&apos;app è fornita &quot;così com&apos;è&quot; senza garanzia di disponibilità continua o
            assenza di errori.
          </p>
        </div>
      </section>

      <footer className="footer">
        <p>© 2025 — YouDrive</p>
      </footer>
    </Layout>
  );
}
