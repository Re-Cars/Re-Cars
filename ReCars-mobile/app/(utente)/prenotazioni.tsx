import MappaOfficina from "@/components/utente/MappaOfficina";
import SectionScreen from "@/components/utente/SectionScreen";
import { apiFetch } from "@/constants/api";
import { logoutGlobale, useVeicoli } from "@/hooks/use-veicoli";
import { FontAwesome6 } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const SLOT_ORARI = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];

const COLORI_AVATAR = [
  "#f97316",
  "#ea580c",
  "#d97706",
  "#16a34a",
  "#1e3a8a",
  "#7c3aed",
  "#0891b2",
];

type Officina = {
  id: number;
  nome: string;
  specialita: string;
  categoria: string;
  stelle: number;
  recensioni: number;
  distanza_km: number;
  aperta: boolean;
  orario: string;
  indirizzo: string;
  telefono: string;
  servizi: string[];
};

/* come geocodificaIndirizzo() del web: Nominatim con fallback su Milano */
async function geocodificaIndirizzo(indirizzo: string) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(indirizzo)}&limit=1`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {
    console.warn("Geocodifica fallita, uso coordinate di default.");
  }
  return { lat: 45.4642, lng: 9.19 };
}

export default function PrenotazioniScreen() {
  const { veicoli, veicoloAttivo, seleziona, elimina } = useVeicoli();

  const [officine, setOfficine] = useState<Officina[]>([]);
  const [stato, setStato] = useState<"loading" | "ok" | "errore">("loading");
  const [ricerca, setRicerca] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);

  // officina evidenziata sulla mappa (come selezionaOfficina del web)
  const [selezionataId, setSelezionataId] = useState<number | null>(null);
  const [coords, setCoords] = useState<
    Record<number, { lat: number; lng: number }>
  >({});

  // prenotazione
  const [officinaSel, setOfficinaSel] = useState<Officina | null>(null);
  const [servizio, setServizio] = useState("");
  const [dataPren, setDataPren] = useState("");
  const [slot, setSlot] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState<{ msg: string; err: boolean } | null>(
    null,
  );
  const [inviando, setInviando] = useState(false);
  const [toast, setToast] = useState("");

  async function caricaOfficine() {
    setStato("loading");
    try {
      const res = await apiFetch("/officina/all");
      if (res.status === 401) {
        await logoutGlobale();
        return;
      }
      if (!res.ok) throw new Error(`Errore server: ${res.status}`);
      const data = await res.json();
      setOfficine(
        data.map((o: any) => ({
          id: o.id,
          nome: o.nome || "Officina senza nome",
          specialita: o.specialita || "Meccanica Generale",
          categoria: o.categoria || "Meccanica",
          stelle: parseFloat(o.stelle || 4.5),
          recensioni: parseInt(o.recensioni || 12, 10),
          distanza_km: parseFloat(o.distanza_km || (Math.random() * 5).toFixed(1)),
          aperta: o.aperta !== undefined ? o.aperta : true,
          orario: o.orario || "08:00 - 18:00",
          indirizzo: o.indirizzo || "Indirizzo non specificato",
          telefono: o.telefono || "",
          servizi: Array.isArray(o.servizi)
            ? o.servizi
            : o.servizi
              ? String(o.servizi).split(",")
              : ["Riparazione", "Tagliando"],
        })),
      );
      setStato("ok");
    } catch (err) {
      console.error("Errore caricamento officine", err);
      setStato("errore");
    }
  }

  useEffect(() => {
    caricaOfficine();
  }, []);

  const categorie = [...new Set(officine.map((o) => o.categoria))];
  const visibili = officine
    .filter((o) =>
      categoria ? o.categoria === categoria : true,
    )
    .filter((o) => {
      const q = ricerca.trim().toLowerCase();
      if (!q) return true;
      return (
        o.nome.toLowerCase().includes(q) ||
        o.specialita.toLowerCase().includes(q) ||
        o.servizi.some((s) => s.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => a.distanza_km - b.distanza_km);

  const selezionata =
    visibili.find((o) => o.id === selezionataId) ?? visibili[0] ?? null;

  /* geocodifica l'officina selezionata (una sola volta per indirizzo) */
  useEffect(() => {
    if (!selezionata || coords[selezionata.id]) return;
    let annullato = false;
    geocodificaIndirizzo(selezionata.indirizzo).then((punto) => {
      if (!annullato) {
        setCoords((prev) => ({ ...prev, [selezionata.id]: punto }));
      }
    });
    return () => {
      annullato = true;
    };
  }, [selezionata, coords]);

  /* come apriMappa() del web */
  function apriMappaEsterna() {
    if (!selezionata) return;
    const q = encodeURIComponent(selezionata.indirizzo);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
  }

  function apriPrenotazione(o: Officina) {
    setSelezionataId(o.id);
    setOfficinaSel(o);
    setServizio("");
    setDataPren(new Date().toISOString().split("T")[0]);
    setSlot(null);
    setNote("");
    setFeedback(null);
  }

  async function confermaPrenotazione() {
    if (!officinaSel) return;
    if (!servizio || !dataPren || !slot) {
      setFeedback({
        msg: "Compila tutti i campi obbligatori (Servizio, Data, Orario).",
        err: true,
      });
      return;
    }
    let dataIso: string;
    try {
      dataIso = new Date(dataPren).toISOString();
    } catch {
      setFeedback({ msg: "Data non valida (usa AAAA-MM-GG).", err: true });
      return;
    }

    setInviando(true);
    try {
      const res = await apiFetch("/prenotazioni", {
        method: "POST",
        body: JSON.stringify({
          officinaId: officinaSel.id,
          servizio,
          data: dataIso,
          orario: slot,
          note,
        }),
      });
      if (res.status === 401) {
        await logoutGlobale();
        return;
      }
      if (!res.ok) throw new Error(`Errore di rete: ${res.status}`);
      setOfficinaSel(null);
      setToast("Prenotazione confermata con successo!");
      setTimeout(() => setToast(""), 4000);
    } catch {
      setFeedback({
        msg: "Impossibile elaborare la prenotazione. Riprova più tardi.",
        err: true,
      });
    } finally {
      setInviando(false);
    }
  }

  return (
    <SectionScreen
      titolo="Prenota Appuntamento"
      veicoli={veicoli}
      veicoloAttivo={veicoloAttivo}
      onSeleziona={seleziona}
      onElimina={elimina}
    >
      {/* hero */}
      <View className="items-center mb-4">
        <View className="flex-row items-center gap-2">
          <FontAwesome6 name="magnifying-glass" size={15} color="#f97316" />
          <Text className="text-xl font-bold text-orange">Cerca Officina</Text>
        </View>
        <Text className="text-xs text-muted mt-1">
          Trova la migliore officina vicino a te
        </Text>
      </View>

      {/* ricerca */}
      <View
        className="flex-row items-center gap-3 rounded-xl px-4 mb-3"
        style={{
          backgroundColor: "rgba(255,255,255,0.06)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.12)",
        }}
      >
        <FontAwesome6 name="magnifying-glass" size={13} color="#a0a8b8" />
        <TextInput
          value={ricerca}
          onChangeText={setRicerca}
          placeholder="Tipo di servizio, nome officina..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          className="flex-1 text-white text-sm py-3"
        />
      </View>

      {/* filtri categorie */}
      {categorie.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-3"
          contentContainerStyle={{ gap: 6 }}
        >
          {categorie.map((c) => {
            const attiva = categoria === c;
            return (
              <TouchableOpacity
                key={c}
                onPress={() => setCategoria(attiva ? null : c)}
                className="rounded-full px-3 py-1.5"
                style={{
                  backgroundColor: attiva
                    ? "rgba(249,115,22,0.2)"
                    : "rgba(255,255,255,0.05)",
                  borderWidth: 1,
                  borderColor: attiva ? "#f97316" : "rgba(255,255,255,0.1)",
                }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: attiva ? "#f97316" : "#a0a8b8" }}
                >
                  {c}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <Text className="text-xs text-muted mb-2">
        {visibili.length} risultat{visibili.length === 1 ? "o" : "i"} · più
        vicine prima
      </Text>

      {stato === "loading" && (
        <ActivityIndicator color="#f97316" style={{ marginTop: 30 }} />
      )}

      {stato === "errore" && (
        <View className="items-center gap-3 py-8">
          <FontAwesome6 name="triangle-exclamation" size={20} color="#f87171" />
          <Text className="text-sm" style={{ color: "#f87171" }}>
            Impossibile caricare le officine
          </Text>
          <TouchableOpacity
            onPress={caricaOfficine}
            className="flex-row items-center gap-2 rounded-full px-5 py-2"
            style={{
              backgroundColor: "rgba(249,115,22,0.18)",
              borderWidth: 1,
              borderColor: "#f97316",
            }}
          >
            <FontAwesome6 name="rotate-right" size={11} color="#f97316" />
            <Text className="text-xs font-bold text-orange">Riprova</Text>
          </TouchableOpacity>
        </View>
      )}

      {stato === "ok" && visibili.length === 0 && (
        <View className="items-center gap-2 py-8">
          <FontAwesome6 name="magnifying-glass" size={18} color="#a0a8b8" />
          <Text className="text-sm text-muted">Nessuna officina trovata</Text>
        </View>
      )}

      {/* mappa officina selezionata (come #mappa-leaflet del web) */}
      {stato === "ok" && selezionata && (
        <View
          className="mb-3 overflow-hidden"
          style={{
            height: 200,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.12)",
            backgroundColor: "#141445",
          }}
        >
          {coords[selezionata.id] ? (
            <MappaOfficina
              lat={coords[selezionata.id].lat}
              lng={coords[selezionata.id].lng}
              nome={selezionata.nome}
              indirizzo={selezionata.indirizzo}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#f97316" />
            </View>
          )}
          {/* btn-open-map */}
          <TouchableOpacity
            onPress={apriMappaEsterna}
            activeOpacity={0.8}
            className="flex-row items-center gap-1.5"
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: "rgba(249,115,22,0.5)",
              backgroundColor: "#141445",
            }}
          >
            <FontAwesome6
              name="arrow-up-right-from-square"
              size={10}
              color="#f97316"
            />
            <Text className="text-xs text-white">Apri Mappa</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* lista officine */}
      <View className="gap-3">
        {visibili.map((o) => {
          const colore = COLORI_AVATAR[o.nome.charCodeAt(0) % COLORI_AVATAR.length];
          const attiva = selezionata?.id === o.id;
          return (
            <TouchableOpacity
              key={o.id}
              onPress={() => setSelezionataId(o.id)}
              activeOpacity={0.85}
              className="rounded-2xl p-4"
              style={{
                backgroundColor: "#141445",
                borderWidth: attiva ? 1 : 0.5,
                borderColor: attiva ? "#f97316" : "rgba(255,255,255,0.08)",
              }}
            >
              <View className="flex-row items-center gap-3">
                <View
                  className="w-11 h-11 rounded-xl items-center justify-center"
                  style={{ backgroundColor: `${colore}30` }}
                >
                  <Text
                    className="text-base font-extrabold"
                    style={{ color: colore }}
                  >
                    {o.nome.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text
                    className="text-sm font-bold text-white"
                    numberOfLines={1}
                  >
                    {o.nome}
                  </Text>
                  <Text className="text-xs text-white/45" numberOfLines={1}>
                    {o.specialita}
                  </Text>
                </View>
                <View
                  className="rounded px-1.5 py-0.5"
                  style={{
                    backgroundColor: o.aperta
                      ? "rgba(74,222,128,0.15)"
                      : "rgba(248,113,113,0.15)",
                  }}
                >
                  <Text
                    className="text-[10px] font-bold"
                    style={{ color: o.aperta ? "#22c55e" : "#f87171" }}
                  >
                    • {o.aperta ? "Aperta" : "Chiusa"}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-3 mt-2.5">
                <View className="flex-row items-center gap-1">
                  <FontAwesome6 name="star" size={10} color="#fbbf24" solid />
                  <Text className="text-xs font-semibold text-white">
                    {o.stelle.toFixed(1)}
                  </Text>
                  <Text className="text-[10px] text-white/35">
                    ({o.recensioni})
                  </Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <FontAwesome6 name="location-dot" size={10} color="#f97316" />
                  <Text className="text-xs text-white/50">
                    {o.distanza_km.toFixed(1)} km
                  </Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <FontAwesome6 name="clock" size={10} color="#a0a8b8" />
                  <Text className="text-xs text-white/50">{o.orario}</Text>
                </View>
              </View>

              <Text className="text-[11px] text-white/40 mt-1.5" numberOfLines={1}>
                {o.indirizzo}
              </Text>

              <View className="flex-row flex-wrap gap-1.5 mt-2.5">
                {o.servizi.slice(0, 3).map((s) => (
                  <View
                    key={s}
                    className="rounded-md px-2 py-0.5"
                    style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                  >
                    <Text className="text-[10px] text-white/60">{s.trim()}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                onPress={() => apriPrenotazione(o)}
                activeOpacity={0.8}
                className="flex-row items-center justify-center gap-2 rounded-full py-2.5 mt-3"
                style={{
                  backgroundColor: "rgba(249,115,22,0.18)",
                  borderWidth: 1,
                  borderColor: "#f97316",
                }}
              >
                <FontAwesome6 name="calendar-check" size={12} color="#f97316" />
                <Text className="text-xs font-bold text-orange">
                  Prenota Appuntamento
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* toast */}
      {toast !== "" && (
        <View
          className="rounded-xl px-4 py-3 mt-4"
          style={{ backgroundColor: "#22c55e" }}
        >
          <Text className="text-sm font-semibold text-white text-center">
            {toast}
          </Text>
        </View>
      )}

      {/* modal prenotazione */}
      <Modal
        visible={officinaSel !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setOfficinaSel(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "#141445",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderTopWidth: 0.5,
              borderColor: "rgba(249,115,22,0.3)",
              padding: 20,
              paddingBottom: 36,
              maxHeight: "88%",
            }}
          >
            <View className="flex-row items-center justify-between mb-1">
              <View className="flex-row items-center gap-2">
                <FontAwesome6 name="calendar-check" size={14} color="#f97316" />
                <Text className="text-base font-bold text-white">
                  Prenota Appuntamento
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setOfficinaSel(null)}
                hitSlop={10}
              >
                <FontAwesome6 name="xmark" size={16} color="#a0a8b8" />
              </TouchableOpacity>
            </View>
            <Text className="text-xs text-muted mb-4">{officinaSel?.nome}</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-xs text-muted mb-1.5">Servizio</Text>
              <View className="flex-row flex-wrap gap-1.5 mb-4">
                {(officinaSel?.servizi ?? []).map((s) => {
                  const sel = servizio === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setServizio(s)}
                      className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
                      style={{
                        backgroundColor: sel
                          ? "rgba(249,115,22,0.2)"
                          : "rgba(255,255,255,0.05)",
                        borderWidth: 1,
                        borderColor: sel ? "#f97316" : "rgba(255,255,255,0.1)",
                      }}
                    >
                      <FontAwesome6
                        name="screwdriver-wrench"
                        size={9}
                        color={sel ? "#f97316" : "#a0a8b8"}
                      />
                      <Text
                        className="text-xs"
                        style={{ color: sel ? "#f97316" : "#a0a8b8" }}
                      >
                        {s.trim()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text className="text-xs text-muted mb-1.5">Data</Text>
              <View
                className="flex-row items-center gap-3 rounded-xl px-4 mb-4"
                style={{
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.12)",
                }}
              >
                <FontAwesome6 name="calendar" size={13} color="#f97316" />
                <TextInput
                  value={dataPren}
                  onChangeText={setDataPren}
                  placeholder="AAAA-MM-GG"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  className="flex-1 text-white text-sm py-3"
                />
              </View>

              <Text className="text-xs text-muted mb-1.5">Orario</Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {SLOT_ORARI.map((orario) => {
                  const sel = slot === orario;
                  return (
                    <TouchableOpacity
                      key={orario}
                      onPress={() => setSlot(orario)}
                      className="rounded-lg px-3.5 py-2"
                      style={{
                        backgroundColor: sel
                          ? "#f97316"
                          : "rgba(255,255,255,0.05)",
                        borderWidth: 1,
                        borderColor: sel ? "#f97316" : "rgba(255,255,255,0.12)",
                      }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: sel ? "#fff" : "#a0a8b8" }}
                      >
                        {orario}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text className="text-xs text-muted mb-1.5">
                Note (opzionale)
              </Text>
              <View
                className="flex-row items-start gap-3 rounded-xl px-4 mb-3"
                style={{
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.12)",
                }}
              >
                <View style={{ paddingTop: 14 }}>
                  <FontAwesome6 name="comment" size={13} color="#f97316" />
                </View>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Es. portare a freddo, problema ai freni..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  multiline
                  numberOfLines={2}
                  className="flex-1 text-white text-sm py-3"
                  style={{ minHeight: 56, textAlignVertical: "top" }}
                />
              </View>

              {feedback && (
                <View
                  className="rounded-lg px-3 py-2.5 mb-3"
                  style={{
                    backgroundColor: feedback.err
                      ? "rgba(239,68,68,0.15)"
                      : "rgba(34,197,94,0.15)",
                  }}
                >
                  <Text
                    className="text-xs"
                    style={{ color: feedback.err ? "#f87171" : "#4ade80" }}
                  >
                    {feedback.msg}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={confermaPrenotazione}
                disabled={inviando}
                activeOpacity={0.8}
                className="flex-row items-center justify-center gap-2 rounded-full py-3"
                style={{
                  backgroundColor: "rgba(249,115,22,0.18)",
                  borderWidth: 1,
                  borderColor: "#f97316",
                }}
              >
                <FontAwesome6 name="check" size={12} color="#f97316" />
                <Text className="text-sm font-bold text-orange">
                  {inviando ? "Invio..." : "Conferma Prenotazione"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SectionScreen>
  );
}
