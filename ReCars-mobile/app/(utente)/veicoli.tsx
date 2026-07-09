import SectionScreen from "@/components/utente/SectionScreen";
import { apiFetch, Veicolo } from "@/constants/api";
import { useVeicoli } from "@/hooks/use-veicoli";
import { FontAwesome6 } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";

/* dettagli extra per riga caricati da /veicolo/:id (come caricaDettagliVeicolo
   di functions-veicoli.js) */
type Dettagli = {
  tipoAnno: string;
  bolloOk: boolean;
  rcaOk: boolean;
};

function BadgeStato({ ok, icon, label }: { ok: boolean; icon: string; label: string }) {
  const colore = ok ? "#4ade80" : "#ff6b6b";
  return (
    <View
      className="flex-row items-center gap-1 rounded-md px-1.5 py-0.5"
      style={{
        backgroundColor: ok ? "rgba(74,222,128,0.1)" : "rgba(255,107,107,0.1)",
        borderWidth: 0.5,
        borderColor: ok ? "rgba(74,222,128,0.35)" : "rgba(255,107,107,0.35)",
      }}
    >
      <FontAwesome6 name={icon as any} size={8} color={colore} />
      <Text className="text-[9px] font-bold" style={{ color: colore }}>
        {label}
      </Text>
    </View>
  );
}

export default function VeicoliScreen() {
  const { veicoli, veicoloAttivo, seleziona, elimina } = useVeicoli();

  const [dettagli, setDettagli] = useState<Record<number, Dettagli>>({});
  const [daEliminare, setDaEliminare] = useState<Veicolo | null>(null);

  useEffect(() => {
    let annullato = false;
    async function caricaDettagli() {
      for (const v of veicoli) {
        try {
          const res = await apiFetch(`/veicolo/${v.id}`);
          if (!res.ok) continue;
          const data = await res.json();
          const dg = data.dati_generici?.[0] ?? {};
          const ds = data.dati_specifici?.[0] ?? {};
          const anno = ds.dataimmatricolazione
            ? new Date(ds.dataimmatricolazione).getFullYear()
            : "-";
          if (annullato) return;
          setDettagli((prev) => ({
            ...prev,
            [v.id]: {
              tipoAnno: `${dg.tipo_veicolo || "Autovettura"} · ${anno}`,
              bolloOk: !!ds.isbolloattivo,
              rcaOk: !!ds.isinsured,
            },
          }));
        } catch {
          // riga senza dettagli extra
        }
      }
    }
    if (veicoli.length > 0) caricaDettagli();
    return () => {
      annullato = true;
    };
  }, [veicoli]);

  return (
    <SectionScreen
      titolo="I miei veicoli"
      veicoli={veicoli}
      veicoloAttivo={veicoloAttivo}
      onSeleziona={seleziona}
      onElimina={elimina}
    >
      {/* card elenco come .vl-section-card */}
      <View
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: "#141445",
          borderWidth: 0.5,
          borderColor: "rgba(249,115,22,0.25)",
        }}
      >
        <View
          className="flex-row items-center gap-2.5 px-4 py-3"
          style={{
            borderBottomWidth: 0.5,
            borderColor: "rgba(249,115,22,0.2)",
          }}
        >
          <FontAwesome6 name="car" size={13} color="#f97316" />
          <Text className="text-sm font-bold text-white">
            Veicoli registrati
          </Text>
        </View>

        <View className="p-3 gap-2">
          {veicoli.length === 0 ? (
            <View className="items-center gap-2 py-8">
              <FontAwesome6
                name="car-side"
                size={26}
                color="rgba(255,255,255,0.2)"
              />
              <Text className="text-sm text-white/45 text-center leading-5">
                Nessun veicolo registrato.{"\n"}Aggiungi il tuo primo veicolo
                per iniziare.
              </Text>
            </View>
          ) : (
            veicoli.map((v) => {
              const attivo = v.id === veicoloAttivo?.id;
              const det = dettagli[v.id];
              return (
                <TouchableOpacity
                  key={v.id}
                  onPress={() => seleziona(v)}
                  activeOpacity={0.75}
                  className="flex-row items-center gap-3 rounded-xl p-3"
                  style={{
                    backgroundColor: attivo
                      ? "rgba(249,115,22,0.1)"
                      : "rgba(255,255,255,0.03)",
                    borderWidth: attivo ? 1 : 0.5,
                    borderColor: attivo
                      ? "rgba(249,115,22,0.5)"
                      : "rgba(255,255,255,0.07)",
                  }}
                >
                  <View className="w-10 h-10 rounded-xl bg-orange/10 items-center justify-center">
                    <FontAwesome6
                      name={v.tipo === "motorcycle" ? "motorcycle" : "car"}
                      size={16}
                      color="#f97316"
                    />
                  </View>

                  <View className="flex-1 gap-1">
                    <Text
                      className={`text-sm font-bold ${attivo ? "text-orange" : "text-white"}`}
                      numberOfLines={1}
                    >
                      {v.nome}
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <View className="bg-orange/15 border border-orange/30 rounded px-1.5 py-0.5">
                        <Text className="text-[9px] font-bold text-orange tracking-widest">
                          {v.targa}
                        </Text>
                      </View>
                      <Text className="text-[10px] text-white/40" numberOfLines={1}>
                        {det?.tipoAnno ?? "Caricamento..."}
                      </Text>
                    </View>
                    {det && (
                      <View className="flex-row gap-1.5">
                        <BadgeStato
                          ok={det.bolloOk}
                          icon={det.bolloOk ? "circle-check" : "circle-xmark"}
                          label="Bollo"
                        />
                        <BadgeStato
                          ok={det.rcaOk}
                          icon="shield-halved"
                          label="RCA"
                        />
                      </View>
                    )}
                  </View>

                  {/* azioni: info + elimina come .vl-actions */}
                  <View className="gap-2">
                    <TouchableOpacity
                      onPress={() => {
                        seleziona(v);
                        router.push("/(utente)/info-veicolo");
                      }}
                      hitSlop={6}
                      className="w-8 h-8 rounded-lg items-center justify-center"
                      style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                    >
                      <FontAwesome6
                        name="circle-info"
                        size={13}
                        color="#a0a8b8"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setDaEliminare(v)}
                      hitSlop={6}
                      className="w-8 h-8 rounded-lg items-center justify-center"
                      style={{ backgroundColor: "rgba(255,107,107,0.08)" }}
                    >
                      <FontAwesome6
                        name="trash"
                        size={12}
                        color="rgba(255,107,107,0.7)"
                      />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </View>

      {/* aggiungi veicolo come .vl-aggiungi-wrap */}
      <TouchableOpacity
        onPress={() => router.push("/(utente)/cerca-veicolo")}
        activeOpacity={0.8}
        className="self-center flex-row items-center gap-2 rounded-full px-5 py-2.5 mt-5"
        style={{
          backgroundColor: "rgba(249,115,22,0.08)",
          borderWidth: 1,
          borderColor: "rgba(249,115,22,0.5)",
        }}
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: "#f97316",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FontAwesome6 name="plus" size={10} color="#fff" />
        </View>
        <Text className="text-xs font-bold text-orange">Aggiungi veicolo</Text>
      </TouchableOpacity>

      {/* conferma elimina (stesso overlay del web) */}
      <Modal
        visible={daEliminare !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDaEliminare(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "#141445",
              borderRadius: 18,
              padding: 26,
              maxWidth: 320,
              width: "88%",
              alignItems: "center",
              gap: 10,
              borderWidth: 1,
              borderColor: "rgba(255,107,107,0.2)",
            }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: "rgba(255,107,107,0.1)",
                borderWidth: 1.5,
                borderColor: "rgba(255,107,107,0.3)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 4,
              }}
            >
              <FontAwesome6
                name="triangle-exclamation"
                size={18}
                color="#ff6b6b"
              />
            </View>
            <Text className="text-base font-bold text-white">
              Elimina veicolo
            </Text>
            <Text className="text-sm text-muted text-center leading-5">
              Vuoi rimuovere{" "}
              <Text className="font-bold text-white">{daEliminare?.nome}</Text>{" "}
              dal tuo garage?
            </Text>
            <View className="flex-row gap-2.5 w-full mt-2">
              <TouchableOpacity
                onPress={() => setDaEliminare(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/15 items-center"
              >
                <Text className="text-sm font-semibold text-muted">
                  Annulla
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  const v = daEliminare;
                  setDaEliminare(null);
                  if (v) await elimina(v.id);
                }}
                className="flex-1 py-2.5 rounded-xl items-center"
                style={{ backgroundColor: "#ff6b6b" }}
              >
                <Text className="text-sm font-bold text-white">Elimina</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SectionScreen>
  );
}
