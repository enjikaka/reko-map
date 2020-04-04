(function () {

  if ('adoptedStyleSheets' in document) { return; }

  var hasShadyCss = 'ShadyCSS' in window && !window.ShadyCSS.nativeShadow;
  var deferredStyleSheets = [];
  var deferredDocumentStyleElements = [];
  var adoptedSheetsRegistry = new WeakMap();
  var sheetMetadataRegistry = new WeakMap();
  var locationRegistry = new WeakMap();
  var observerRegistry = new WeakMap();
  var appliedActionsCursorRegistry = new WeakMap();
  var state = {
    loaded: false
  };
  var frame = {
    body: null,
    CSSStyleSheet: null
  };
  var OldCSSStyleSheet = CSSStyleSheet;

  function instanceOfStyleSheet(instance) {
    return instance instanceof OldCSSStyleSheet || instance instanceof frame.CSSStyleSheet;
  }
  function checkAndPrepare(sheets, container) {
    var locationType = container === document ? 'Document' : 'ShadowRoot';
    if (!Array.isArray(sheets)) {
      throw new TypeError("Failed to set the 'adoptedStyleSheets' property on " + locationType + ": Iterator getter is not callable.");
    }
    if (!sheets.every(instanceOfStyleSheet)) {
      throw new TypeError("Failed to set the 'adoptedStyleSheets' property on " + locationType + ": Failed to convert value to 'CSSStyleSheet'");
    }
    var uniqueSheets = sheets.filter(function (value, index) {
      return sheets.indexOf(value) === index;
    });
    adoptedSheetsRegistry.set(container, uniqueSheets);
    return uniqueSheets;
  }
  function isDocumentLoading() {
    return document.readyState === 'loading';
  }
  function getAdoptedStyleSheet(location) {
    return adoptedSheetsRegistry.get(location.parentNode === document.documentElement ? document : location);
  }

  var importPattern = /@import/;
  var cssStyleSheetMethods = ['addImport', 'addPageRule', 'addRule', 'deleteRule', 'insertRule', 'removeImport', 'removeRule'];
  var cssStyleSheetNewMethods = ['replace', 'replaceSync'];
  function updatePrototype(proto) {
    cssStyleSheetNewMethods.forEach(function (methodKey) {
      proto[methodKey] = function () {
        return ConstructStyleSheet.prototype[methodKey].apply(this, arguments);
      };
    });
    cssStyleSheetMethods.forEach(function (methodKey) {
      var oldMethod = proto[methodKey];
      proto[methodKey] = function () {
        var args = arguments;
        var result = oldMethod.apply(this, args);
        if (sheetMetadataRegistry.has(this)) {
          var _sheetMetadataRegistr = sheetMetadataRegistry.get(this),
              adopters = _sheetMetadataRegistr.adopters,
              actions = _sheetMetadataRegistr.actions;
          adopters.forEach(function (styleElement) {
            if (styleElement.sheet) {
              styleElement.sheet[methodKey].apply(styleElement.sheet, args);
            }
          });
          actions.push([methodKey, args]);
        }
        return result;
      };
    });
  }
  function updateAdopters(sheet) {
    var _sheetMetadataRegistr2 = sheetMetadataRegistry.get(sheet),
        adopters = _sheetMetadataRegistr2.adopters,
        basicStyleElement = _sheetMetadataRegistr2.basicStyleElement;
    adopters.forEach(function (styleElement) {
      styleElement.innerHTML = basicStyleElement.innerHTML;
    });
  }
  var ConstructStyleSheet =
  function () {
    function ConstructStyleSheet() {
      var basicStyleElement = document.createElement('style');
      if (state.loaded) {
        frame.body.appendChild(basicStyleElement);
      } else {
        document.head.appendChild(basicStyleElement);
        basicStyleElement.disabled = true;
        deferredStyleSheets.push(basicStyleElement);
      }
      var nativeStyleSheet = basicStyleElement.sheet;
      sheetMetadataRegistry.set(nativeStyleSheet, {
        adopters: new Map(),
        actions: [],
        basicStyleElement: basicStyleElement
      });
      return nativeStyleSheet;
    }
    var _proto = ConstructStyleSheet.prototype;
    _proto.replace = function replace(contents) {
      var _this = this;
      return new Promise(function (resolve, reject) {
        if (sheetMetadataRegistry.has(_this)) {
          var _sheetMetadataRegistr3 = sheetMetadataRegistry.get(_this),
              basicStyleElement = _sheetMetadataRegistr3.basicStyleElement;

          basicStyleElement.innerHTML = contents;
          resolve(basicStyleElement.sheet);
          updateAdopters(_this);
        } else {
          reject(new Error("Failed to execute 'replace' on 'CSSStyleSheet': Can't call replace on non-constructed CSSStyleSheets."));
        }
      });
    };
    _proto.replaceSync = function replaceSync(contents) {
      if (importPattern.test(contents)) {
        throw new Error('@import rules are not allowed when creating stylesheet synchronously');
      }
      if (sheetMetadataRegistry.has(this)) {
        var _sheetMetadataRegistr4 = sheetMetadataRegistry.get(this),
            basicStyleElement = _sheetMetadataRegistr4.basicStyleElement;
        basicStyleElement.innerHTML = contents;
        updateAdopters(this);
        return basicStyleElement.sheet;
      } else {
        throw new Error("Failed to execute 'replaceSync' on 'CSSStyleSheet': Can't call replaceSync on non-constructed CSSStyleSheets.");
      }
    };
    return ConstructStyleSheet;
  }();
  Object.defineProperty(ConstructStyleSheet, Symbol.hasInstance, {
    configurable: true,
    value: instanceOfStyleSheet
  });

  function adoptStyleSheets(location) {
    var newStyles = document.createDocumentFragment();
    var sheets = getAdoptedStyleSheet(location);
    var observer = observerRegistry.get(location);
    for (var i = 0, len = sheets.length; i < len; i++) {
      var _sheetMetadataRegistr = sheetMetadataRegistry.get(sheets[i]),
          adopters = _sheetMetadataRegistr.adopters,
          basicStyleElement = _sheetMetadataRegistr.basicStyleElement;
      var elementToAdopt = adopters.get(location);
      if (elementToAdopt) {
        observer.disconnect();
        newStyles.appendChild(elementToAdopt);
        if (!elementToAdopt.innerHTML || elementToAdopt.sheet && !elementToAdopt.sheet.cssText) {
          elementToAdopt.innerHTML = basicStyleElement.innerHTML;
        }
        observer.observe();
      } else {
        elementToAdopt = document.createElement('style');
        elementToAdopt.innerHTML = basicStyleElement.innerHTML;
        locationRegistry.set(elementToAdopt, location);
        appliedActionsCursorRegistry.set(elementToAdopt, 0);
        adopters.set(location, elementToAdopt);
        newStyles.appendChild(elementToAdopt);
      }
      if (location === document.head) {
        deferredDocumentStyleElements.push(elementToAdopt);
      }
    }
    location.insertBefore(newStyles, location.firstChild);
    for (var _i = 0, _len = sheets.length; _i < _len; _i++) {
      var _sheetMetadataRegistr2 = sheetMetadataRegistry.get(sheets[_i]),
          _adopters = _sheetMetadataRegistr2.adopters,
          actions = _sheetMetadataRegistr2.actions;
      var adoptedStyleElement = _adopters.get(location);
      var cursor = appliedActionsCursorRegistry.get(adoptedStyleElement);
      if (actions.length > 0) {
        for (var _i2 = cursor, _len2 = actions.length; _i2 < _len2; _i2++) {
          var _actions$_i = actions[_i2],
              key = _actions$_i[0],
              args = _actions$_i[1];
          adoptedStyleElement.sheet[key].apply(adoptedStyleElement.sheet, args);
        }
        appliedActionsCursorRegistry.set(adoptedStyleElement, actions.length - 1);
      }
    }
  }
  function removeExcludedStyleSheets(location, oldSheets) {
    var sheets = getAdoptedStyleSheet(location);
    for (var i = 0, len = oldSheets.length; i < len; i++) {
      if (sheets.indexOf(oldSheets[i]) > -1) {
        return;
      }
      var _sheetMetadataRegistr3 = sheetMetadataRegistry.get(oldSheets[i]),
          adopters = _sheetMetadataRegistr3.adopters;
      var observer = observerRegistry.get(location);
      var styleElement = adopters.get(location);
      observer.disconnect();
      styleElement.parentNode.removeChild(styleElement);
      observer.observe();
    }
  }

  function adoptAndRestoreStylesOnMutationCallback(mutations) {
    for (var i = 0, len = mutations.length; i < len; i++) {
      var _mutations$i = mutations[i],
          addedNodes = _mutations$i.addedNodes,
          removedNodes = _mutations$i.removedNodes;
      for (var _i = 0, _len = removedNodes.length; _i < _len; _i++) {
        var location = locationRegistry.get(removedNodes[_i]);
        if (location) {
          adoptStyleSheets(location);
        }
      }
      if (!hasShadyCss) {
        for (var _i2 = 0, _len2 = addedNodes.length; _i2 < _len2; _i2++) {
          var iter = document.createNodeIterator(addedNodes[_i2], NodeFilter.SHOW_ELEMENT, function (node) {
            return node.shadowRoot && node.shadowRoot.adoptedStyleSheets.length > 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
          },
          null, false);
          var node = void 0;
          while (node = iter.nextNode()) {
            adoptStyleSheets(node.shadowRoot);
          }
        }
      }
    }
  }
  function createObserver(location) {
    var observer = new MutationObserver(adoptAndRestoreStylesOnMutationCallback);
    var observerTool = {
      observe: function observe() {
        observer.observe(location, {
          childList: true,
          subtree: true
        });
      },
      disconnect: function disconnect() {
        observer.disconnect();
      }
    };
    observerRegistry.set(location, observerTool);
    observerTool.observe();
  }

  function initPolyfill() {
    var iframe = document.createElement('iframe');
    iframe.hidden = true;
    document.body.appendChild(iframe);
    frame.body = iframe.contentWindow.document.body;
    frame.CSSStyleSheet = iframe.contentWindow.CSSStyleSheet;
    updatePrototype(iframe.contentWindow.CSSStyleSheet.prototype);
    createObserver(document.body);
    state.loaded = true;
    var fragment = document.createDocumentFragment();
    for (var i = 0, len = deferredStyleSheets.length; i < len; i++) {
      deferredStyleSheets[i].disabled = false;
      fragment.appendChild(deferredStyleSheets[i]);
    }
    frame.body.appendChild(fragment);
    for (var _i = 0, _len = deferredDocumentStyleElements.length; _i < _len; _i++) {
      fragment.appendChild(deferredDocumentStyleElements[_i]);
    }
    document.body.insertBefore(fragment, document.body.firstChild);
    deferredStyleSheets.length = 0;
    deferredDocumentStyleElements.length = 0;
  }
  function initAdoptedStyleSheets() {
    var adoptedStyleSheetAccessors = {
      configurable: true,
      get: function get() {
        return adoptedSheetsRegistry.get(this) || [];
      },
      set: function set(sheets) {
        var oldSheets = adoptedSheetsRegistry.get(this) || [];
        checkAndPrepare(sheets, this);
        var location = this === document ?
        isDocumentLoading() ? this.head : this.body : this;
        var isConnected = 'isConnected' in location ? location.isConnected : document.body.contains(location);

        window.requestAnimationFrame(function() {
          if (isConnected) {
            adoptStyleSheets(location);
            removeExcludedStyleSheets(location, oldSheets);
          }
        }, 0);
      }
    };
    Object.defineProperty(Document.prototype, 'adoptedStyleSheets', adoptedStyleSheetAccessors);
    if (typeof ShadowRoot !== 'undefined') {
      var attachShadow = HTMLElement.prototype.attachShadow;
      HTMLElement.prototype.attachShadow = function () {
        var location = hasShadyCss ? this : attachShadow.apply(this, arguments);
        createObserver(location);
        return location;
      };
      Object.defineProperty(ShadowRoot.prototype, 'adoptedStyleSheets', adoptedStyleSheetAccessors);
    }
  }

  updatePrototype(OldCSSStyleSheet.prototype);
  window.CSSStyleSheet = ConstructStyleSheet;
  initAdoptedStyleSheets();
  if (isDocumentLoading()) {
    document.addEventListener('DOMContentLoaded', initPolyfill);
  } else {
    initPolyfill();
  }

}());

/**
 * Converts a snake-case string to camelCase
 *
 * @param {string} str kebab-cased string
 * @returns {string} camelCased string
 */
function kebabToCamelCase(str) {
  return str.replace(/(-)([a-z])/g, g => g[1].toUpperCase());
}
/**
 * Converts a camelCase string to kebab-case
 *
 * @param {string} str camelCased string
 * @returns {string} kebab-cased string
 */

function camelToKebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}
/**
 * Takes attributes from element and creates an object
 * with the keys camelCased.
 *
 * @param {NamedNodeMap} attributes Element.attributes
 * @returns {object} Object with camelCased keys
 */

function attributesToObject(attributes) {
  return attributes ? Array.from(attributes).reduce((cur, {
    localName,
    value
  }) => ({ ...cur,
    [kebabToCamelCase(localName)]: value
  }), {}) : {};
}
/**
 * Converts a string of HTML into nodes.
 *
 * @param {string} string HTML in string form
 * @returns {DocumentFragment} Nodes parsed from the HTML string
 */

function stringToElements(string) {
  return document.createRange().createContextualFragment(string);
}
/**
 * @param {string[] | string} strings
 * @param {any[]} rest
 * @returns {CSSStyleSheet}
 */

function css(strings, ...rest) {
  const text = Array.isArray(strings) ? strings.reduce((acc, curr, i) => {
    return acc + (rest[i] ? curr + rest[i] : curr);
  }, '') : strings;
  const sheet = new CSSStyleSheet(); // @ts-ignore

  sheet.replace(text);
  return sheet;
}
/**
 * @export
 * @param {string[] | string} strings
 * @param {any[]} rest
 * @returns {DocumentFragment}
 */

function html(strings, ...rest) {
  const text = Array.isArray(strings) ? strings.reduce((acc, curr, i) => {
    return acc + (rest[i] ? curr + rest[i] : curr);
  }, '') : strings;
  return stringToElements(text);
}

const ComponentCache = {};
const CSSCache = {};
class Component extends HTMLElement {
  constructor(componentPath) {
    super();

    if (componentPath) {
      this.componentPath = componentPath;
    } else {
      console.warn('You did not send a path to the super method in your constructor. Thus CSS and HTML cannot be read for this component.', this);
      console.warn('If shipping for modern browser, then call super with import.meta.url. If not, specify a path that is similar to import.meta.url yourself.');
      console.warn('Should be the path to the component you are making.');
    }
  }

  $(q) {
    return this._sDOM.querySelector(q);
  }

  get cssPath() {
    return this.componentPath && this.componentPath.replace(/\.(html|js)/gi, '.css');
  }

  get htmlPath() {
    return this.componentPath && this.componentPath.replace(/\.(css|js)/gi, '.html');
  }

  get props() {
    return attributesToObject(this.attributes);
  }
  /**
   * Fetch sibling CSS if componentPath was sent in the super call.
   * Execute the render method of the component and return the result as a node
   *
   * @returns {Promise<DocumentFragment>}
   */


  async _render() {
    const cssText = CSSCache[this.cssPath];

    if (!cssText && this.cssPath) {
      const sheet = await this.fetchCSSAsStyleSheet(); // @ts-ignore

      this._sDOM.adoptedStyleSheets = [sheet];
    } // @ts-ignore


    const htmlText = this.render(this.props);
    return stringToElements(htmlText);
  }

  async fetchHTMLAsDocFrag() {
    const response = await fetch(this.htmlPath);

    if (response.ok) {
      const text = await response.text();
      return stringToElements(text);
    }

    throw new Error('Fetch failed');
  }

  async fetchCSSAsStyleSheet() {
    const sheet = new CSSStyleSheet();
    const response = await fetch(this.cssPath);

    if (response.ok && response.headers.get('content-type').indexOf('text/css') !== -1) {
      const text = await response.text(); // @ts-ignore

      await sheet.replace(text);
    }

    return sheet;
  }
  /**
   * Fetch sibling CSS and HTML if componentPath was sent in the super call.
   * If these has already been fetched (a component is initied more than one)
   * then re-use the cached document fragment instead of fethcing again.
   *
   * @returns {Promise<Node>}
   */


  async _renderHTMLFile() {
    const componentId = btoa(this.componentPath);

    if (!ComponentCache[componentId]) {
      ComponentCache[componentId] = Promise.all([this.fetchHTMLAsDocFrag(), this.fetchCSSAsStyleSheet()]);
    }

    const [docFrag, sheet] = await ComponentCache[componentId]; // @ts-ignore

    this._sDOM.adoptedStyleSheets = [sheet];
    return docFrag.cloneNode(true);
  } // Kinda like Reacts componentDidMount


  componentDidMount() {}

  async connectedCallback() {
    this._sDOM = this.attachShadow({
      mode: 'closed'
    });
    let content; // @ts-ignore

    if (this.render) {
      content = await this._render();
    } else if (this.componentPath) {
      content = await this._renderHTMLFile();
    } else {
      console.error('No render function or component path found for static html/css.');
    }

    this._sDOM.innerHTML = null;

    this._sDOM.appendChild(content);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (this.componentDidMount) {
          this.componentDidMount();
        }
      });
    });
  }

}
/**
 * Takes a class for an extended Component/HTMLElement
 * and registes it basedof the ClassName as class-name.
 *
 * @param {CustomElementConstructor} classInstace Instance of a custom element to register
 * @returns {string} the kebab-case version fo ClassName
 */

function registerComponent(classInstace) {
  // @ts-ignore
  const componentName = 'is' in classInstace ? classInstace.is : classInstace.prototype.constructor.name;
  const kebabName = camelToKebabCase(componentName);
  customElements.define(kebabName, classInstace);
  return kebabName;
}

/**
 * @param {Function} functionalComponent
 * @param {{ metaUrl: ?string, observedAttributes: string[] }} options
 * @returns {CustomElementConstructor}
 */

function generateFunctionComponent(functionalComponent, {
  metaUrl,
  observedAttributes
}) {
  return class extends HTMLElement {
    constructor() {
      super();
      this._html = undefined;
      this._css = undefined;
      this._postRender = undefined;
      this._propsChanged = undefined;
      this._componentPath = metaUrl;
    }

    get cssPath() {
      return this._componentPath && this._componentPath.replace(/\.(html|js)/gi, '.css');
    }

    get htmlPath() {
      return this._componentPath && this._componentPath.replace(/\.(css|js)/gi, '.html');
    }

    static get observedAttributes() {
      return observedAttributes;
    }

    async _render(props) {
      this._rendering = functionalComponent.apply(this.customThis, [props]);

      if (this._rendering instanceof Promise) {
        await this._rendering;
      }

      await new Promise(resolve => {
        if (this._css) {
          requestAnimationFrame(() => {
            // @ts-ignore
            this._sDOM.adoptedStyleSheets = [this._css];
          });
        } else {
          console.warn('Missing CSS. Will render without it.');
        }

        if (this._html) {
          requestAnimationFrame(() => {
            this._sDOM.innerHTML = null;

            this._sDOM.appendChild(this._html);

            resolve();
          });
        } else {
          console.warn('Missing HTML. Will render without it.');
        }

        resolve();
      });
      requestAnimationFrame(() => {
        if (this._postRender instanceof Function) {
          this._postRender();
        }
      });
    }

    get customThis() {
      return {
        /**
         * @param {string[]} strings
         * @returns {DocumentFragment}
         */
        html: (strings, ...rest) => {
          this._html = html(strings, ...rest);
          return this._html;
        },

        /**
         * @param {string[]} strings
         * @returns {CSSStyleSheet}
         */
        css: (strings, ...rest) => {
          this._css = css(strings, ...rest);
          return this._css;
        },

        /**
         * @param {string | URL} path
         */
        useHTML: async path => {
          path = path || this.htmlPath;

          if (!path) {
            return;
          }

          if (path instanceof URL) {
            path = path.toString();
          }

          const response = await fetch(path);
          const text = await response.text();
          return this.customThis.html([text]);
        },

        /**
         * @param {string | URL} path
         */
        useCSS: async path => {
          path = path || this.cssPath;

          if (!path) {
            return;
          }

          if (path instanceof URL) {
            path = path.toString();
          }

          const response = await fetch(path);
          const text = await response.text();
          return this.customThis.css([text]);
        },
        postRender: method => {
          this._postRender = method;
        },
        propsChanged: method => {
          this._propsChanged = method;
        },
        $: selector => {
          if (selector === undefined) {
            return this;
          }

          if (selector === ':host') {
            return this._sDOM;
          }

          return this._sDOM.querySelector(selector);
        },
        $$: selector => this._sDOM.querySelectorAll(selector)
      };
    }

    async attributeChangedCallback() {
      await this._render(attributesToObject(this.attributes));
      requestAnimationFrame(() => {
        if (this._propsChanged instanceof Function) {
          this._propsChanged(attributesToObject(this.attributes));
        }
      });
    }

    async connectedCallback() {
      this._sDOM = this.attachShadow({
        mode: 'closed'
      });

      this._render(attributesToObject(this.attributes));
    }

  };
}
/**
 * @param {Function} functionComponent
 * @param {{ metaUrl: ?string, observedAttributes: string[] }} options
 * @returns {string} Custom element tag name.
 */


function registerFunctionComponent(functionComponent, {
  metaUrl,
  observedAttributes
} = {
  metaUrl: undefined,
  observedAttributes: []
}) {
  const kebabName = camelToKebabCase(functionComponent.name);
  customElements.define(kebabName, generateFunctionComponent(functionComponent, {
    metaUrl,
    observedAttributes
  }));
  return kebabName;
}

export { Component, registerComponent, registerFunctionComponent };
