import SectionScreen from "@/components/utente/SectionScreen";
import { useVeicoli } from "@/hooks/use-veicoli";
import { FontAwesome6 } from "@expo/vector-icons";
import { useState } from "react";
import { LayoutAnimation, Text, TouchableOpacity, View } from "react-native";

/* stesse domande dell'accordion di info-domande.html (risposte segnaposto
   come nel web) */
const DOMANDE = [
  "Perchè utilizzare la nostra applicazione tra tante?",
  "Come avviene l'inserimento del veicolo?",
  "Quanti veicoli posso registrare?",
  "Come cancello la registrazione del veicolo nella mia area?",
  "Cosa offre il piano gratuito?",
  "Gli abbonamenti come funzionano? e Procedura",
  "Prenotare una officina per il veicolo? Come fare?",
  "Recensire officina? procedura",
  "Segnalare problemantiche, come fare:",
  "Annullare iscrizione all'applicazione, come fare:",
  "Annullare o modificare abbonamento, come fare:",
];

const RISPOSTA_SEGNAPOSTO = "Segna posto";

export default function InfoDomandeScreen() {
  const { veicoli, veicoloAttivo, seleziona, elimina } = useVeicoli();
  const [aperta, setAperta] = useState<number | null>(null);

  function toggle(i: number) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAperta((prev) => (prev === i ? null : i));
  }

  return (
    <SectionScreen
      titolo="Info e domande"
      veicoli={veicoli}
      veicoloAttivo={veicoloAttivo}
      onSeleziona={seleziona}
      onElimina={elimina}
    >
      <Text className="text-xl font-bold text-orange text-center">
        Info e domande
      </Text>
      <Text className="text-xs text-white/50 text-center leading-4 mt-2 mb-5">
        Hai bisogno di aiuto per comprendere meglio l&apos;applicazione? Tocca
        le possibili domande
      </Text>

      <View className="gap-2">
        {DOMANDE.map((domanda, i) => {
          const isAperta = aperta === i;
          return (
            <View
              key={i}
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: "#141445",
                borderWidth: 0.5,
                borderColor: isAperta
                  ? "rgba(249,115,22,0.5)"
                  : "rgba(255,255,255,0.08)",
              }}
            >
              <TouchableOpacity
                onPress={() => toggle(i)}
                activeOpacity={0.75}
                className="flex-row items-center gap-3 p-3.5"
              >
                <Text
                  className="text-base font-bold"
                  style={{ color: "#f97316" }}
                >
                  -
                </Text>
                <Text
                  className={`flex-1 text-xs font-semibold ${isAperta ? "text-orange" : "text-white/80"}`}
                >
                  {domanda}
                </Text>
                <FontAwesome6
                  name={isAperta ? "chevron-up" : "chevron-down"}
                  size={10}
                  color={isAperta ? "#f97316" : "#a0a8b8"}
                />
              </TouchableOpacity>
              {isAperta && (
                <View
                  className="px-4 pb-3.5 pt-1"
                  style={{
                    borderTopWidth: 0.5,
                    borderColor: "rgba(255,255,255,0.06)",
                  }}
                >
                  <Text className="text-xs text-white/55 leading-5 pt-2">
                    {RISPOSTA_SEGNAPOSTO}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </SectionScreen>
  );
}
