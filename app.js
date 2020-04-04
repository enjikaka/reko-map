import './lantmateriet-karta.js';

async function init () {
  const { leafletMap: map } = document.querySelector('lantmateriet-karta');

  const response = await fetch('rekorings.json');
  const rekoRings = await response.json();

  rekoRings.forEach(rekoRing => {
    const text = `
      <strong>${rekoRing.name}</strong>
      <p>${rekoRing.desc}</p>
    `;

    const circleMarker = L.circleMarker(rekoRing.coords, {
      color: 'var(--reko-colour-darker)',
      fillColor: 'var(--reko-colour)',
      fillOpacity: 0.5,
      radius: 10,
    });

    if (text) {
      circleMarker.bindPopup(text);
    }

    circleMarker.addTo(map);
  });
}

document.addEventListener('DOMContentLoaded', () => init());Array