import SectionScreen from "@/components/utente/SectionScreen";
import { useVeicoli } from "@/hooks/use-veicoli";
import { ReactNode } from "react";
import { Text, View } from "react-native";

/* contenuto di termini-privacy.html adattato a schermata scrollabile */

function H2({ children }: { children: ReactNode }) {
  return (
    <Text
      className="text-base font-bold mt-5 mb-2"
      style={{ color: "#f97316" }}
    >
      {children}
    </Text>
  );
}

function H3({ children }: { children: ReactNode }) {
  return (
    <Text className="text-sm font-bold text-white mt-3 mb-1.5">{children}</Text>
  );
}

function P({ children }: { children: ReactNode }) {
  return (
    <Text className="text-xs text-white/60 leading-5 mb-2">{children}</Text>
  );
}

function Li({ children }: { children: ReactNode }) {
  return (
    <View className="flex-row gap-2 mb-1 pl-1">
      <Text className="text-xs" style={{ color: "#f97316" }}>
        •
      </Text>
      <Text className="flex-1 text-xs text-white/60 leading-5">{children}</Text>
    </View>
  );
}

export default function TerminiPrivacyScreen() {
  const { veicoli, veicoloAttivo, seleziona, elimina } = useVeicoli();

  return (
    <SectionScreen
      titolo="Termini e privacy"
      veicoli={veicoli}
      veicoloAttivo={veicoloAttivo}
      onSeleziona={seleziona}
      onElimina={elimina}
    >
      <Text className="text-xl font-bold text-orange text-center">
        Termini e privacy policy
      </Text>
      <Text className="text-xs text-white/40 text-center mt-1 mb-4">
        Ultimo aggiornamento: [DATA]
      </Text>

      <View
        className="rounded-2xl p-5"
        style={{
          backgroundColor: "#141445",
          borderWidth: 0.5,
          borderColor: "rgba(249,115,22,0.25)",
        }}
      >
        <H2>Introduzione</H2>
        <P>
          Questa pagina descrive i Termini di Servizio e la Privacy Policy
          dell&apos;applicazione <Text className="font-bold">RE|CARS</Text>.
        </P>
        <P>L&apos;app consente agli utenti di:</P>
        <Li>Gestire informazioni sui propri veicoli</Li>
        <Li>Annotare manutenzioni e interventi</Li>
        <Li>Prenotare appuntamenti presso officine o meccanici</Li>
        <Li>Pubblicare recensioni sui servizi ricevuti</Li>

        <H2>Titolare del Servizio</H2>
        <P>Titolare del trattamento dei dati:</P>
        <View
          className="rounded-xl p-3.5 my-1 mb-2"
          style={{
            backgroundColor: "rgba(249,115,22,0.08)",
            borderLeftWidth: 3,
            borderLeftColor: "#f97316",
          }}
        >
          <Text className="text-xs font-bold text-white mb-1">
            [Nome Azienda / Sviluppatore]
          </Text>
          <Text className="text-xs text-white/60 leading-5">
            Email: [email]{"\n"}Indirizzo: [indirizzo]
          </Text>
        </View>

        <H2>Dati Raccolti</H2>
        <H3>Dati forniti dall&apos;utente</H3>
        <Li>Nome e cognome</Li>
        <Li>Email</Li>
        <Li>Numero di telefono (opzionale)</Li>
        <Li>Dati del veicolo (marca, modello, targa, chilometraggio)</Li>
        <Li>Note e manutenzioni</Li>
        <Li>Recensioni pubblicate</Li>
        <H3>Dati tecnici</H3>
        <Li>Indirizzo IP</Li>
        <Li>Tipo di dispositivo</Li>
        <Li>Sistema operativo</Li>
        <Li>Dati di utilizzo dell&apos;app</Li>

        <H2>Finalità del Trattamento</H2>
        <P>I dati vengono utilizzati per:</P>
        <Li>Fornire i servizi dell&apos;app</Li>
        <Li>Gestire prenotazioni con officine</Li>
        <Li>Consentire la pubblicazione di recensioni</Li>
        <Li>Migliorare il servizio</Li>
        <Li>Garantire sicurezza della piattaforma</Li>

        <H2>Condivisione dei Dati</H2>
        <P>I dati possono essere condivisi con:</P>
        <Li>Officine coinvolte negli appuntamenti</Li>
        <Li>Servizi cloud e hosting</Li>
        <Li>Strumenti di analisi delle prestazioni</Li>
        <P>I dati non vengono venduti a terzi.</P>

        <H2>Conservazione dei Dati</H2>
        <P>
          I dati vengono conservati per il tempo necessario a fornire il
          servizio o fino alla richiesta di cancellazione dell&apos;utente.
        </P>

        <H2>Diritti dell&apos;Utente</H2>
        <P>L&apos;utente ha diritto di:</P>
        <Li>Accedere ai propri dati</Li>
        <Li>Richiedere la modifica dei dati</Li>
        <Li>Richiedere la cancellazione</Li>
        <Li>Limitare il trattamento</Li>
        <Li>Richiedere la portabilità dei dati</Li>
        <P>
          Per esercitare questi diritti contattare:{" "}
          <Text className="font-bold text-white/80">[email]</Text>
        </P>

        <H2>Termini di Servizio</H2>
        <H3>Utilizzo dell&apos;app</H3>
        <P>
          L&apos;utente si impegna a utilizzare l&apos;applicazione in modo
          conforme alle leggi vigenti.
        </P>
        <H3>Prenotazioni officine</H3>
        <P>
          L&apos;app funge da piattaforma per facilitare il contatto tra utenti
          e officine. Il gestore dell&apos;app non è responsabile per i servizi
          forniti dalle officine.
        </P>
        <H3>Recensioni</H3>
        <P>
          Le recensioni rappresentano opinioni personali degli utenti.
          Contenuti offensivi, falsi o illegali possono essere rimossi.
        </P>
        <H3>Limitazione di responsabilità</H3>
        <P>
          L&apos;app è fornita &quot;così com&apos;è&quot; senza garanzia di
          disponibilità continua o assenza di errori.
        </P>
      </View>

      <Text className="text-xs text-center mt-5" style={{ color: "#f97316" }}>
        © 2025 — RE|CARS
      </Text>
    </SectionScreen>
  );
}
