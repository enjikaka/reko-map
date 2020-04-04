import './lantmateriet-karta.js';

function parsePageData (pageData) {
  return pageData.map(rawRing => ({
    coords: rawRing[1][0][0],
    name: rawRing[5][0][1][0],
    desc: rawRing[5][1] ? rawRing[5][1][1][0] : null
  }));
}

function init () {
  const rekoRings = parsePageData(jsonPageData[1][6][3][12][0][13][0]);

  const { leafletMap: map } = document.querySelector('lantmateriet-karta');

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