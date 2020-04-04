import { registerFunctionComponent } from '../web_modules/webact.js';

async function fetchPage(pageId) {
  const response = await fetch(`reko-page/${pageId}.html`);
  const text = await response.text();

  return text;
}

async function RekoPage (props) {
  const { $, useCSS, propsChanged } = this;

  await useCSS();

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

    $('#close-button').addEventListener('click', () => history.back());

    history.pushState({ page: 1 }, null, "/" + pageId);

    window.onpopstate = event => {
      if (event.state === null) {
        $().removeAttribute('page-id');
      }
    };
  });
}

export default registerFunctionComponent(RekoPage, {
  metaUrl: import.meta.url,
  observedAttributes: ['page-id']
});
