import SectionScreen from "@/components/utente/SectionScreen";
import { useVeicoli } from "@/hooks/use-veicoli";
import { FontAwesome6 } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

/* piani come abbonamenti.html (Base / Premium / Pro) */
const PIANI = [
  {
    id: "base",
    nome: "Base",
    prezzo: "Gratis",
    periodo: "",
    desc: "Per iniziare a gestire i tuoi veicoli",
    popolare: false,
    features: [
      { ok: true, label: "1 veicolo" },
      { ok: true, label: "Storico interventi base" },
      { ok: true, label: "Notifiche scadenze" },
      { ok: false, label: "Prenotazione officine" },
      { ok: false, label: "Recensioni officine" },
      { ok: false, label: "Supporto prioritario" },
    ],
  },
  {
    id: "premium",
    nome: "Premium",
    prezzo: "4,99€",
    periodo: "/mese",
    desc: "Per chi vuole il massimo dalla propria auto",
    popolare: true,
    features: [
      { ok: true, label: "Fino a 5 veicoli" },
      { ok: true, label: "Storico completo interventi" },
      { ok: true, label: "Notifiche personalizzate" },
      { ok: true, label: "Prenotazione officine" },
      { ok: true, label: "Recensioni officine" },
      { ok: false, label: "Supporto prioritario" },
    ],
  },
  {
    id: "pro",
    nome: "Pro",
    prezzo: "9,99€",
    periodo: "/mese",
    desc: "Per chi gestisce più veicoli e vuole tutto",
    popolare: false,
    features: [
      { ok: true, label: "Veicoli illimitati" },
      { ok: true, label: "Storico + grafici costi" },
      { ok: true, label: "Notifiche avanzate" },
      { ok: true, label: "Prenotazione prioritaria" },
      { ok: true, label: "Recensioni + community" },
      { ok: true, label: "Supporto prioritario" },
    ],
  },
] as const;

/* piano attivo dell'utente (per ora sempre Base, come il default web) */
const PIANO_ATTIVO = "base";

export default function AbbonamentiScreen() {
  const { veicoli, veicoloAttivo, seleziona, elimina } = useVeicoli();

  return (
    <SectionScreen
      titolo="Abbonamenti"
      veicoli={veicoli}
      veicoloAttivo={veicoloAttivo}
      onSeleziona={seleziona}
      onElimina={elimina}
    >
      {/* banner piano attivo come .abb-piano-attivo */}
      <View
        className="flex-row items-center justify-between rounded-2xl p-4 mb-5"
        style={{
          backgroundColor: "#141445",
          borderWidth: 0.5,
          borderColor: "rgba(249,115,22,0.25)",
        }}
      >
        <View>
          <Text className="text-[10px] uppercase tracking-wider text-white/35">
            Piano attivo
          </Text>
          <Text className="text-base font-bold text-white mt-0.5">
            Piano Base
          </Text>
          <Text className="text-xs text-white/45">1 veicolo incluso</Text>
        </View>
        <View
          className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1"
          style={{ backgroundColor: "rgba(74,222,128,0.12)" }}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: "#4ade80",
            }}
          />
          <Text className="text-[10px] font-bold" style={{ color: "#4ade80" }}>
            Attivo
          </Text>
        </View>
      </View>

      <Text className="text-lg font-bold text-white text-center mb-4">
        Scegli il tuo piano
      </Text>

      <View className="gap-4">
        {PIANI.map((piano) => {
          const attuale = piano.id === PIANO_ATTIVO;
          return (
            <View
              key={piano.id}
              className="rounded-2xl p-5 gap-4"
              style={{
                backgroundColor: "#141445",
                borderWidth: piano.popolare ? 1.5 : 0.5,
                borderColor: piano.popolare
                  ? "#f97316"
                  : "rgba(255,255,255,0.1)",
              }}
            >
              {piano.popolare && (
                <View
                  className="absolute self-center rounded-full px-3 py-1"
                  style={{ top: -12, backgroundColor: "#f97316" }}
                >
                  <Text className="text-[10px] font-bold text-white uppercase tracking-wider">
                    Più popolare
                  </Text>
                </View>
              )}

              <View>
                <Text className="text-base font-bold text-white">
                  {piano.nome}
                </Text>
                <View className="flex-row items-baseline gap-1 mt-1">
                  <Text className="text-2xl font-extrabold text-orange">
                    {piano.prezzo}
                  </Text>
                  {piano.periodo !== "" && (
                    <Text className="text-xs text-white/45">
                      {piano.periodo}
                    </Text>
                  )}
                </View>
                <Text className="text-xs text-white/45 mt-1">{piano.desc}</Text>
              </View>

              <View className="gap-2">
                {piano.features.map((f) => (
                  <View key={f.label} className="flex-row items-center gap-2.5">
                    <FontAwesome6
                      name={f.ok ? "check" : "xmark"}
                      size={11}
                      color={f.ok ? "#4ade80" : "rgba(255,255,255,0.25)"}
                    />
                    <Text
                      className="text-xs"
                      style={{
                        color: f.ok ? "#e8e8e8" : "rgba(255,255,255,0.3)",
                        textDecorationLine: f.ok ? "none" : "line-through",
                      }}
                    >
                      {f.label}
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                disabled={attuale}
                activeOpacity={0.8}
                className="items-center rounded-full py-2.5"
                style={
                  attuale
                    ? {
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.15)",
                      }
                    : { backgroundColor: "#f97316" }
                }
              >
                <Text
                  className="text-sm font-bold"
                  style={{ color: attuale ? "#a0a8b8" : "#ffffff" }}
                >
                  {attuale ? "Piano attuale" : `Passa a ${piano.nome}`}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* nota stripe come .abb-stripe-note */}
      <View className="flex-row items-start gap-2.5 mt-5 px-2">
        <View style={{ paddingTop: 2 }}>
          <FontAwesome6
            name="lock"
            size={11}
            color="rgba(255,255,255,0.35)"
          />
        </View>
        <Text className="flex-1 text-[11px] text-white/35 leading-4">
          Il pagamento è gestito in modo sicuro da Stripe. Non conserviamo i
          dati della tua carta. Disdici in qualsiasi momento.
        </Text>
      </View>
    </SectionScreen>
  );
}
