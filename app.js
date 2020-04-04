import './lantmateriet-karta.js';

async function loadMarkersFromJSON({ map, path, color, fillColor }) {
  const response = await fetch(path);
  const items = await response.json();

  items.forEach(item => {
    const text = `
      <strong>${item.name}</strong>
      <p>${item.desc}</p>
      <small>Data från <a href="${item.data.url}" target="_blank">${item.data.name}</a></small>
    `;

    const circleMarker = L.circleMarker(item.coords, {
      color,
      fillColor,
      fillOpacity: 0.5,
      radius: 10,
    });

    if (text) {
      circleMarker.bindPopup(text);
    }

    circleMarker.addTo(map);
  });
}

const loadLocalFoodNodes = map => loadMarkersFromJSON({
  map,
  path: 'localFoodNodes.json',
  color: 'var(--local-food-node-colour-darker)',
  fillColor: 'var(--local-food-node-colour)'
});

const loadRekoRings = map => loadMarkersFromJSON({
  map,
  path: 'rekorings.json',
  color: 'var(--reko-colour-darker)',
  fillColor: 'var(--reko-colour)'
});

async function loadMarkers () {
  const { leafletMap: map } = document.querySelector('lantmateriet-karta');

  loadRekoRings(map);
  loadLocalFoodNodes(map);
}

document.addEventListener('map:ready', () => loadMarkers());
