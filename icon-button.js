import { registerFunctionComponent } from 'https://unpkg.com/webact?module';

function IconButton () {
  const { html, css } = this;

  html`<slot>`;

  css`
    :host {

    }
  `;
}

export default registerFunctionComponent(IconButton);
