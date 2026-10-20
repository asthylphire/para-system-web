// MAP INITIALISATION
const SJDM_CENTER = [14.8183, 121.0520];
const SJDM_BOUNDS = L.latLngBounds(
  L.latLng(14.6800, 121.0100),
  L.latLng(14.8800, 121.1700)
);

var map               = null;
var originMarker      = null;
var destinationMarker = null;
var routeLine         = null;
var landmarkMarkers   = {};

const CATEGORY_COLORS = {
  school:   '#3498db',
  hospital: '#e74c3c',
  terminal: '#27ae60',
  market:   '#e67e22',
  church:   '#9b59b6',
  park:     '#1abc9c',
  food:     '#f39c12',
  other:    '#7f8c8d'
};

function initMap() {
  if (map) return;

  map = L.map('map', {
    center: SJDM_CENTER,
    zoom: 13,
    maxBounds: SJDM_BOUNDS,
    maxBoundsViscosity: 0.85,
    minZoom: 11
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18
  }).addTo(map);

  map.on('contextmenu', function (e) {
    if (!Auth.isLoggedIn()) {
      showNotification('Log in first to save landmarks.', 'warning');
      return;
    }
    openAddLandmarkModal(e.latlng.lat, e.latlng.lng);
  });
}

// MARKER HELPERS
function _labelIcon(text, color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color};color:#000;padding:4px 10px;
      border-radius:12px;font-size:11px;font-weight:700;
      white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.22);
      font-family:Poppins,sans-serif;
    ">${escapeHtml(text)}</div>`,
    iconAnchor: [0, 22]
  });
}

function setOriginMarker(lat, lng, label) {
  if (originMarker) map.removeLayer(originMarker);
  originMarker = L.marker([lat, lng], { icon: _labelIcon(label, '#27ae60') }).addTo(map);
  _drawRoute();
}

function setDestinationMarker(lat, lng, label) {
  if (destinationMarker) map.removeLayer(destinationMarker);
  destinationMarker = L.marker([lat, lng], { icon: _labelIcon(label, '#E67E22') }).addTo(map);
  _drawRoute();
}

// Draws the line between the two markers. The fare itself is computed by the server
// (see refreshFareCalculation in app.js), so no distance maths is needed here anymore.
function _drawRoute() {
  if (routeLine) map.removeLayer(routeLine);
  if (!originMarker || !destinationMarker) return;

  const o = originMarker.getLatLng();
  const d = destinationMarker.getLatLng();

  routeLine = L.polyline([o, d], {
    color: '#3498db',
    weight: 4,
    opacity: 0.85,
    dashArray: '10, 7'
  }).addTo(map);

  map.fitBounds(L.latLngBounds([o, d]).pad(0.25));
  refreshFareCalculation();
}

// LANDMARK MARKERS
async function renderSavedLandmarks() {
  if (!map) return;
  Object.values(landmarkMarkers).forEach(m => map.removeLayer(m));
  landmarkMarkers = {};
  if (!Auth.isLoggedIn()) { DataManager.reset(); return; }
  try {
    const list = await DataManager.load();
    list.forEach(lm => addLandmarkMarker(lm));
  } catch (err) {
    showNotification(API.describe(err), 'error');
  }
}

function addLandmarkMarker(lm) {
  if (!map) return;
  const icon  = L.divIcon({
    className: '',
    html: `<div style="
      background:#F1C40F;border:2px solid #d4ac0d;
      width:34px;height:34px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:16px;cursor:pointer;
      box-shadow:0 2px 8px rgba(0,0,0,0.22);
    ">★</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });

  const marker = L.marker([lm.lat, lm.lng], { icon }).addTo(map);
  marker.on('click', () => openViewLandmarkModal(lm.id));
  landmarkMarkers[lm.id] = marker;
}

function panToLandmark(lm) {
  if (map) map.setView([lm.lat, lm.lng], 16, { animate: true });
}

// NOMINATIM LOCATION SEARCH
async function searchLocations(query) {
  if (!query || query.length < 2) return [];
  try {
    const url = 'https://nominatim.openstreetmap.org/search'
      + '?q=' + encodeURIComponent(query + ' San Jose del Monte Bulacan Philippines')
      + '&format=json&limit=8&countrycodes=ph'
      + '&bounded=1&viewbox=121.0100,14.8800,121.1700,14.6800';

    const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();

    return data.map(item => {
      const parts = item.display_name.split(', ');
      return {
        name: parts.slice(0, Math.min(3, parts.length)).join(', '),
        lat:  parseFloat(item.lat),
        lng:  parseFloat(item.lon)
      };
    });
  } catch (err) {
    console.error('[MapLogic] Nominatim error:', err);
    return [];
  }
}
