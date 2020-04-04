import fetch from 'make-fetch-happen';
import fs from 'fs-extra';
import unescapeJs from 'unescape-js';

function transformGoogleMapPageData(pageData) {
  return pageData.map(rawRing => ({
    coords: rawRing[1] ? rawRing[1][0][0] : null,
    name: rawRing[5][0][1][0],
    desc: rawRing[5][1] ? rawRing[5][1][1][0] : null,
    data: {
      name: 'Hushållningssällskapet',
      url: 'https://hushallningssallskapet.se/'
    }
  }));
}

function tranformLocalFoodNodes (json) {
  return json.nodes.map(node => ({
    coords: [node.location.lat, node.location.lng],
    name: node.name,
    desc: `${node.info}\n${node.email}`,
    data: {
      name: 'Local Food Nodes',
      url: 'https://localfoodnodes.org/sv'
    }
  }));
}

async function fetchRekorings () {
  const response = await fetch('https://www.google.com/maps/d/viewer?mid=1xjBoGhnHE_aw7hsPjaxPtyDQPze_L1ex');
  const text = await response.text();

  const jsonText = unescapeJs(text.split('var _pageData = "')[1].split('";</script>')[0]);
  // await fs.writeFile('rekorings.dump.txt', jsonText);

  const json = JSON.parse(jsonText);
  const transformedJson = transformGoogleMapPageData(json[1][6][3][12][0][13][0]);

  await fs.writeJSON('data/rekorings.json', transformedJson);
}

async function fetchLocalFoodNodes() {
  const response = await fetch('https://localfoodnodes.org/api/nodes');
  const json = await response.json();

  const transformedJson = tranformLocalFoodNodes(json);

  await fs.writeJSON('data/localFoodNodes.json', transformedJson);
}

async function generateFallbackPages () {
  const rekorings = await fs.readJSON('data/rekorings.json');
  const localFoodNodes = await fs.readJSON('data/localFoodNodes.json');

  [
    ...rekorings,
    ...localFoodNodes,
  ].map(rekoRing => {
    const placeName = rekoRing.name.toLocaleLowerCase().replace('reko', '').replace('-ring', '');
    const pageId = new Buffer(rekoRing.coords).toString('base64');

    return fs.writeFile(`generated-reko-page/${pageId}.html`, `
      <h1>${placeName}</h1>
      <strong>${rekoRing.name}</strong>
      <p>${rekoRing.desc}</p>
      <small>Data från <a href="${rekoRing.data.url}" target="_blank">${rekoRing.data.name}</a></small>
    `);
  });
}



async function build () {
  fetchLocalFoodNodes();
  await fetchRekorings();
  generateFallbackPages();
}

build();