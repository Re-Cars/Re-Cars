import { WebView } from "react-native-webview";

type Props = {
  lat: number;
  lng: number;
  nome: string;
  indirizzo: string;
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Mappa Leaflet + OpenStreetMap identica a quella del frontend web
 * (inizializzaMappa / aggiornaMappa di functions-prenotazione-utente.js),
 * resa in una WebView. Tile invertite come il tema dark del sito.
 */
export default function MappaOfficina({ lat, lng, nome, indirizzo }: Props) {
  const nomeSafe = escapeHtml(nome);
  const indirizzoSafe = escapeHtml(indirizzo);

  const html = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<style>
  html, body, #mappa { margin: 0; padding: 0; width: 100%; height: 100%; background: #141445; }
  .leaflet-tile { filter: invert(1) hue-rotate(180deg) brightness(0.85) contrast(0.9); }
</style>
</head>
<body>
<div id="mappa"></div>
<script>
  var mappa = L.map('mappa', { zoomControl: false, scrollWheelZoom: false, attributionControl: true })
    .setView([${lat}, ${lng}], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(mappa);

  var icona = L.divIcon({
    className: '',
    html: '<div style="width:36px;height:36px;background:#f97316;border-radius:50%;' +
      'display:flex;align-items:center;justify-content:center;' +
      'color:#fff;font-weight:800;font-size:1rem;' +
      'box-shadow:0 0 0 3px rgba(249,115,22,0.3);border:2px solid #fff;">' +
      ${JSON.stringify(nomeSafe.charAt(0))} + '</div>',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });

  L.marker([${lat}, ${lng}], { icon: icona })
    .addTo(mappa)
    .bindPopup('<strong>${nomeSafe}</strong><br><small>${indirizzoSafe}</small>')
    .openPopup();
</script>
</body>
</html>`;

  return (
    <WebView
      originWhitelist={["*"]}
      source={{ html }}
      style={{ flex: 1, backgroundColor: "#141445" }}
      setSupportMultipleWindows={false}
      overScrollMode="never"
      nestedScrollEnabled
    />
  );
}
