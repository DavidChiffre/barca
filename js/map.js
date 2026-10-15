import { getPlaces, getSteps, getTrip } from './data.js';
import { localized } from './i18n.js';
import { stepDepart, stepArrive, stepStatus, fmtTime } from './time.js';

let map = null, markers = {};

const ROUTE_COORDS = [
  [45.6690, 9.7004],   // Bergamo
  [45.4861, 9.2044],   // Milan
  [46.3194, 7.9875],   // Brig
  [46.1012, 7.0737],   // Martigny
  [46.0344, 6.9329],   // Vallorcine
  [45.9237, 6.8694],   // Chamonix
  [45.8906, 6.7982]    // Les Houches
];

export function initMap(el) {
  if (map) { map.invalidateSize(); return; }

  map = L.map(el, { zoomControl: false }).setView([46.0, 8.2], 7);
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  L.polyline(ROUTE_COORDS, { color: '#4ecdc4', weight: 3, opacity: 0.7 }).addTo(map);

  const tz = getTrip().defaultTimezone;
  for (const place of getPlaces()) {
    if (!place.lat || !place.lng) continue;
    const m = L.circleMarker([place.lat, place.lng], {
      radius: 8, fillColor: '#4ecdc4', color: '#fff', weight: 2, fillOpacity: 0.9
    }).addTo(map);

    const steps = getSteps().filter(s => s.from === place.id || s.to === place.id);
    let popup = `<strong>${localized(place.name)}</strong>`;
    if (place.note) popup += `<br><small>${localized(place.note)}</small>`;
    for (const s of steps) {
      const dep = stepDepart(s, tz);
      if (dep) popup += `<br>${localized(s.title)} ${fmtTime(dep, s.departTz || tz)}`;
    }
    popup += `<br><a href="https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}" target="_blank" rel="noopener" class="popup-dir">Directions →</a>`;
    m.bindPopup(popup);
    markers[place.id] = m;
  }

  if ('geolocation' in navigator) {
    navigator.geolocation.watchPosition(pos => {
      const ll = [pos.coords.latitude, pos.coords.longitude];
      if (!map._userMarker) {
        map._userMarker = L.circleMarker(ll, {
          radius: 6, fillColor: '#ff6b6b', color: '#fff', weight: 2, fillOpacity: 1
        }).addTo(map).bindPopup('You');
      } else {
        map._userMarker.setLatLng(ll);
      }
    }, () => {}, { enableHighAccuracy: true });
  }

  map.fitBounds(L.polyline(ROUTE_COORDS).getBounds().pad(0.1));
}

export function flyToPlace(placeId) {
  const m = markers[placeId];
  if (m && map) {
    map.flyTo(m.getLatLng(), 16, { duration: 0.8 });
    setTimeout(() => m.openPopup(), 900);
  }
}

export function downloadTiles(onProgress) {
  if (!navigator.serviceWorker?.controller) { onProgress(1, 1); return; }
  const tiles = [];
  const bounds = { n: 46.4, s: 45.4, w: 6.7, e: 9.8 };
  for (let z = 8; z <= 12; z++) addTiles(tiles, bounds, z);
  for (const p of getPlaces()) {
    if (!p.lat || !p.lng) continue;
    const b = { n: p.lat + 0.01, s: p.lat - 0.01, w: p.lng - 0.015, e: p.lng + 0.015 };
    for (let z = 13; z <= 16; z++) addTiles(tiles, b, z);
  }
  const unique = [...new Set(tiles)];
  navigator.serviceWorker.controller.postMessage({ type: 'prefetch-tiles', tiles: unique });
  const handler = e => {
    if (e.data.type === 'tile-progress') onProgress(e.data.done, e.data.total);
    if (e.data.type === 'tiles-done') { navigator.serviceWorker.removeEventListener('message', handler); onProgress(1, 1); }
  };
  navigator.serviceWorker.addEventListener('message', handler);
}

function addTiles(arr, b, z) {
  const tl = latlngToTile(b.n, b.w, z), br = latlngToTile(b.s, b.e, z);
  for (let x = tl.x; x <= br.x; x++)
    for (let y = tl.y; y <= br.y; y++)
      arr.push(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`);
}

function latlngToTile(lat, lng, z) {
  const n = 1 << z;
  return {
    x: Math.floor((lng + 180) / 360 * n),
    y: Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n)
  };
}
