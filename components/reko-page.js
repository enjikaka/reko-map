import { registerFunctionComponent } from '../web_modules/webact.js';

async function fetchPage(pageId) {

  const [producers, base] = await Promise.all([
    fetch(`created-page/${pageId}.html`),
    fetch(`generated-page/${pageId}.html`)
  ]);

  let baseText = await base.text();
  const producersText = await producers.text();

  if (producers.ok) {
    baseText = baseText.replace('<p></p>', producersText);
  }

  return baseText;
}

async function RekoPage (props) {
  const { $, useCSS, propsChanged } = this;

  await useCSS();

  function closePage() {
    $().removeAttribute('page-id');
    history.pushState(null, null, "/");
    $(':host').innerHTML = null;
  }

  propsChanged(async () => {
    const { pageId } = props;

    if (!pageId) {
      return;
    }

    const pageHTML = await fetchPage(pageId);

    $(':host').innerHTML = `
      <button id="close-button">
        <i class="material-icons">close</i>
      </button>
      ${pageHTML}
    `;

    $('#close-button').addEventListener('click', () => closePage());

    history.pushState(null, null, "/#!/page/" + pageId);

    window.onpopstate = event => {
      if (event.state === null) {
        closePage();
      }
    };
  });
}

export default registerFunctionComponent(RekoPage, {
  metaUrl: import.meta.url,
  observedAttributes: ['page-id']
});
