import './components/lantmateriet-karta.js';
import './components/reko-page.js';

async function loadMarkersFromJSON({ map, path, color, fillColor }) {
  const response = await fetch(path);
  const items = await response.json();

  items.forEach(item => {
    const circleMarker = L.circleMarker(item.coords, {
      color,
      fillColor,
      fillOpacity: 0.5,
      radius: 10,
    });

    circleMarker.on('click', () => {
      document.dispatchEvent(new CustomEvent('show:page', {
        detail: {
          pageId: btoa(item.coords)
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

document.addEventListener('map:ready', () => {
  loadMarkers();
  document.body.classList.remove('loading');
});
document.addEventListener('show:page', event => loadPage(event));
document.addEventListener('DOMContentLoaded', () => {
  if (document.location.pathname.includes('/page/')) {
    loadPage({
      detail: {
        pageId: document.location.pathname.split('/page/')[1]
      }
    });
  }
});
