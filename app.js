import './components/lantmateriet-karta.js';
import './components/reko-page.js';

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

    circleMarker.on('click', () => {
      document.dispatchEvent(new CustomEvent('show:page', {
        detail: {
          pageId: item.coords.map(String).join('').replace(/\./gi, '')
        }
      }));
    });

    circleMarker.addTo(map);
  });
}

const loadLocalFoodNodes = map => loadMarkersFromJSON({
  map,
  path: 'data/localFoodNodes.json',
  color: 'var(--local-food-node-colour-darker)',
  fillColor: 'var(--local-food-node-colour)'
});

const loadRekoRings = map => loadMarkersFromJSON({
  map,
  path: 'data/rekorings.json',
  color: 'var(--reko-colour-darker)',
  fillColor: 'var(--reko-colour)'
});

async function loadMarkers () {
  const { leafletMap: map } = document.querySelector('lantmateriet-karta');

  loadRekoRings(map);
  loadLocalFoodNodes(map);
}

async function loadPage (event) {
  const rekoPage = document.querySelector('reko-page');

  rekoPage.setAttribute('page-id', event.detail.pageId);
}

document.addEventListener('map:ready', () => loadMarkers());
document.addEventListener('show:page', event => loadPage(event));