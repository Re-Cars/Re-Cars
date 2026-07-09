import SectionScreen from "@/components/utente/SectionScreen";
import { apiFetch } from "@/constants/api";
import { logoutGlobale, useVeicoli } from "@/hooks/use-veicoli";
import { FontAwesome6 } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

type DettaglioVeicolo = {
  marca?: string;
  modello?: string;
  targa?: string;
  tipo?: string;
  anno?: string;
  alimentazione?: string;
  cilindrata?: string;
  cavalli?: string;
  bolloDate?: string;
  bolloAttivo?: boolean;
  rcaCompagnia?: string;
  rcaDate?: string;
  rcaAttiva?: boolean;
};

function SectionBar({ icon, label }: { icon: string; label: string }) {
  return (
    <View
      className="flex-row items-center gap-2.5 px-4 py-3"
      style={{
        borderBottomWidth: 0.5,
        borderColor: "rgba(249,115,22,0.2)",
      }}
    >
      <FontAwesome6 name={icon as any} size={13} color="#f97316" />
      <Text className="text-sm font-bold text-white">{label}</Text>
    </View>
  );
}

function SpecTile({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View
      className="flex-row items-center gap-3 rounded-xl p-3"
      style={{
        width: "48%",
        backgroundColor: "rgba(255,255,255,0.04)",
        borderWidth: 0.5,
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <View className="w-8 h-8 rounded-lg bg-orange/10 items-center justify-center">
        <FontAwesome6 name={icon as any} size={13} color="#f97316" />
      </View>
      <View className="flex-1">
        <Text className="text-[10px] text-white/40">{label}</Text>
        <Text className="text-xs font-semibold text-white" numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function MaintPill({
  icon,
  titolo,
  data,
  attivo,
  labelOk,
  labelKo,
}: {
  icon: string;
  titolo: string;
  data: string;
  attivo: boolean;
  labelOk: string;
  labelKo: string;
}) {
  const colore = attivo ? "#4ade80" : "#f87171";
  return (
    <View
      className="flex-row items-center justify-between rounded-xl p-3"
      style={{
        backgroundColor: "rgba(255,255,255,0.04)",
        borderWidth: 1,
        borderColor: attivo ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)",
      }}
    >
      <View className="flex-row items-center gap-3 flex-1">
        <View className="w-8 h-8 rounded-lg bg-orange/10 items-center justify-center">
          <FontAwesome6 name={icon as any} size={13} color="#f97316" />
        </View>
        <View className="flex-1">
          <Text className="text-xs font-semibold text-white" numberOfLines={1}>
            {titolo}
          </Text>
          <Text className="text-[10px] text-white/40">{data}</Text>
        </View>
      </View>
      <View
        className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1"
        style={{
          backgroundColor: attivo
            ? "rgba(74,222,128,0.12)"
            : "rgba(248,113,113,0.12)",
        }}
      >
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: colore,
          }}
        />
        <Text className="text-[10px] font-bold" style={{ color: colore }}>
          {attivo ? labelOk : labelKo}
        </Text>
      </View>
    </View>
  );
}

export default function InfoVeicoloScreen() {
  const { veicoli, veicoloAttivo, seleziona, elimina } = useVeicoli();
  const [dettaglio, setDettaglio] = useState<DettaglioVeicolo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!veicoloAttivo) return;
    let annullato = false;

    async function carica() {
      setLoading(true);
      try {
        const res = await apiFetch(`/veicolo/${veicoloAttivo!.id}`);
        if (res.status === 401) {
          await logoutGlobale();
          return;
        }
        if (!res.ok) return;
        const v = await res.json();
        if (annullato) return;
        const dg = v.dati_generici?.[0] ?? {};
        const ds = v.dati_specifici?.[0] ?? {};
        setDettaglio({
          marca: v.marca,
          modello: v.modello,
          targa: v.targa,
          tipo: dg.tipo_veicolo,
          anno: ds.dataimmatricolazione
            ? String(new Date(ds.dataimmatricolazione).getFullYear())
            : undefined,
          alimentazione: dg.alimentazione,
          cilindrata: dg.cilindrata ? `${dg.cilindrata} cc` : undefined,
          cavalli: dg.cavalli ? `${dg.cavalli} CV` : undefined,
          bolloDate: ds.datascadenzabollo
            ? `scade il ${new Date(ds.datascadenzabollo).toLocaleDateString("it-IT")}`
            : "Dato non disponibile",
          bolloAttivo: !!ds.isbolloattivo,
          rcaCompagnia: ds.nomeassicurazione,
          rcaDate: ds.datascadenzarca
            ? `scade il ${new Date(ds.datascadenzarca).toLocaleDateString("it-IT")}`
            : "Dato non disponibile",
          rcaAttiva: !!ds.isinsured,
        });
      } catch (err) {
        console.error("Errore nel caricamento info veicolo", err);
      } finally {
        if (!annullato) setLoading(false);
      }
    }
    carica();
    return () => {
      annullato = true;
    };
  }, [veicoloAttivo]);

  const isMoto = (dettaglio?.tipo ?? "").toLowerCase() === "moto";
  const iconaTipo = isMoto ? "motorcycle" : "car";
  const nome =
    `${dettaglio?.marca ?? ""} ${dettaglio?.modello ?? ""}`.trim() ||
    "Veicolo Attivo";

  return (
    <SectionScreen
      titolo="Info Veicolo"
      veicoli={veicoli}
      veicoloAttivo={veicoloAttivo}
      onSeleziona={seleziona}
      onElimina={elimina}
    >
      {loading && !dettaglio ? (
        <ActivityIndicator color="#f97316" style={{ marginTop: 40 }} />
      ) : !veicoloAttivo ? (
        <Text className="text-sm text-muted text-center mt-10">
          Nessun veicolo nel garage. Aggiungine uno dalla ricerca targa.
        </Text>
      ) : (
        <View className="gap-4">
          {/* hero veicolo */}
          <View
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: "#141445",
              borderWidth: 0.5,
              borderColor: "rgba(249,115,22,0.25)",
            }}
          >
            <SectionBar icon={iconaTipo} label="Veicolo" />
            <View className="flex-row items-center gap-4 p-4">
              <View
                className="items-center justify-center rounded-2xl"
                style={{
                  width: 64,
                  height: 64,
                  backgroundColor: "rgba(249,115,22,0.12)",
                  borderWidth: 1.5,
                  borderColor: "rgba(249,115,22,0.35)",
                }}
              >
                <FontAwesome6 name={iconaTipo} size={26} color="#f97316" />
              </View>
              <View className="flex-1 gap-1.5">
                <Text className="text-base font-extrabold text-white">
                  {nome}
                </Text>
                <View className="flex-row flex-wrap gap-1.5">
                  <View className="flex-row items-center gap-1.5 bg-orange/15 border border-orange/40 rounded-md px-2 py-0.5">
                    <FontAwesome6 name="id-card" size={9} color="#f97316" />
                    <Text className="text-[10px] font-bold text-orange tracking-widest">
                      {dettaglio?.targa ?? "-"}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1.5 bg-white/5 rounded-md px-2 py-0.5">
                    <Text className="text-[10px] text-white/50">
                      Tipo{" "}
                      <Text className="font-bold text-white/80">
                        {dettaglio?.tipo ?? "-"}
                      </Text>
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1.5 bg-white/5 rounded-md px-2 py-0.5">
                    <Text className="text-[10px] text-white/50">
                      Anno{" "}
                      <Text className="font-bold text-white/80">
                        {dettaglio?.anno ?? "-"}
                      </Text>
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* caratteristiche tecniche */}
          <View
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: "#141445",
              borderWidth: 0.5,
              borderColor: "rgba(249,115,22,0.25)",
            }}
          >
            <SectionBar icon="gears" label="Caratteristiche tecniche" />
            <View className="flex-row flex-wrap gap-3 p-4 justify-between">
              <SpecTile
                icon="bolt"
                label="Alimentazione"
                value={dettaglio?.alimentazione ?? "-"}
              />
              <SpecTile
                icon="oil-can"
                label="Cilindrata"
                value={dettaglio?.cilindrata ?? "-"}
              />
              <SpecTile
                icon="gauge-high"
                label="Potenza"
                value={dettaglio?.cavalli ?? "-"}
              />
              <SpecTile
                icon="car-side"
                label="Marca"
                value={dettaglio?.marca ?? "-"}
              />
            </View>
          </View>

          {/* mantenimento */}
          <View
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: "#141445",
              borderWidth: 0.5,
              borderColor: "rgba(249,115,22,0.25)",
            }}
          >
            <SectionBar icon="calendar-check" label="Mantenimento" />
            <View className="gap-3 p-4">
              <MaintPill
                icon="receipt"
                titolo="Bollo"
                data={dettaglio?.bolloDate ?? "-"}
                attivo={!!dettaglio?.bolloAttivo}
                labelOk="Attivo"
                labelKo="Scaduto"
              />
              <MaintPill
                icon="shield-halved"
                titolo={`Assicurazione${dettaglio?.rcaCompagnia ? ` · ${dettaglio.rcaCompagnia}` : ""}`}
                data={dettaglio?.rcaDate ?? "-"}
                attivo={!!dettaglio?.rcaAttiva}
                labelOk="Attiva"
                labelKo="Scaduta"
              />
            </View>
          </View>
        </View>
      )}
    </SectionScreen>
  );
}
