import { registerFunctionComponent } from 'https://unpkg.com/webact?module';

function LantmaterietKarta () {
  const { $, html, css, postRender } = this;

  html`<div id="map"></div>`;

  css`
    @import "https://unpkg.com/leaflet@1.6.0/dist/leaflet.css";

    :host,
    #map {
      display: block;
      width: 100%;
      height: 100%;
    }
  `;

  postRender(() => {
    const map = L.map($('#map'), {
      center: [59.9573174, 15.4233244],
      zoom: 6
    });

    const apiKey = '34e74c1ea77e95deaceeee7864c5c83';



    const lantmateriet = L.tileLayer(`https://api.lantmateriet.se/open/topowebb-ccby/v1/wmts/token/${apiKey}/?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=topowebb&STYLE=default&TILEMATRIXSET=3857&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png`, {
      maxZoom: 15,
      attribution: '<a href="https://www.lantmateriet.se/sv/Kartor-och-geografisk-information/oppna-data/">Lantmäteriet</a>'
    });

    map.addLayer(lantmateriet);
  });
}

export default registerFunctionComponent(LantmaterietKarta);
