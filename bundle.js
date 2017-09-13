(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

const style = `.chemical-element {
      font-size: 14px;
      border: solid 1px;
      padding: 0.5em;
      display: inline-block;
    }

    .left,
    .right {
      display: inline-flex;
      flex-direction: column;
    }

    .right {
      font-size: 0.8em;
      padding-left: 1em;
    }

    .symbol {
      font-size: 5em;
      padding-left: 0.2em;
    }

    .link {
      margin-top: 2em;
    }
    `;


module.exports = function ChemicalElement (props) {
  return `
    <div class=chemical-element>
      <style>${style}</style>
      <div class=left>
        <span class=atomicMass>${props.atomicMass}</span>
        <span class=symbol>${props.symbol}</span>
        <span class=atomicNumber>${props.atomicNumber}</span>
      </div>
      <div class=right>
        ${props.electronsPerShell.map(Span).join('')}
      </div>
    </div>
    <div class=link>
      <a href="https://en.wikipedia.org/wiki/${props.name}">${props.name} on Wikipedia</a>
    </div>`;
}

function Span (inner) {
  return `<span>${inner}</span>`
}


},{}],2:[function(require,module,exports){
const periodicTable = require('periodic-table');

/**
 * Cl -> 2 8 7
 * Cl.electronicConfiguration: "[Ne] 3s2 3p5"
 * Ne.electronicConfiguration: "[He] 2s2 2p6"
 * He.electronicConfiguration: "1s2"
 * => "1s2 2s2 2p6 3s2 3p5"  (shell type count)
 * => [2, 8, 7]
 *
 * Algorithm:
 *
 * 1. Replace [Symbol] with symbol.electronicConfiguration until we have all electron configurations.
 * 2. Count electrons per "shell"
 */
module.exports = function electronsPerShell (element) {
  let electronicConfiguration = element.electronicConfiguration;

  while (electronicConfiguration[0] === '[') {
    let nobleGasConf = getNobleGasConfiguration(electronicConfiguration);
    electronicConfiguration = electronicConfiguration.replace(/^\[[^\]]+\]/, nobleGasConf)
  }

  let electronCount = electronicConfiguration.split(' ').reduce((arr, str) => {
    let [, shell, type, count] = str.match(/(\d+)([spdf])(\d+)/);
    shell = parseInt(shell) - 1;
    count = parseInt(count);
    if (arr[shell] === undefined) {
      arr[shell] = count;
    } else {
      arr[shell] += count;
    }

    return arr;
  }, [])

  return electronCount;
}

function getNobleGasConfiguration (configuration) {
  // start with [, one ore more char which is not ], ends with ]
  // Eg, [He]
  let [, nobleGas] = configuration.match(/^\[([^\]]+)\]/);
  return periodicTable.symbols[nobleGas].electronicConfiguration || '';
}
},{"periodic-table":8}],3:[function(require,module,exports){
const periodicTable = require('periodic-table');
const electronsPerShell = require('./electrons-per-shell.js');
const ChemicalElement = require('./chemical-element.js');
const dom2image = require('dom-to-image');
const saveAs = require('file-saver').saveAs;

const inputs = {
  symbol: document.getElementById('chemical-symbol'),
  atomicNumber: document.getElementById('atomic-number'),
  atomicMass: document.getElementById('nucleons'),
  electronsPerShell: document.getElementById('electron-configuration'),
  size: document.getElementById('size')
};
const output = document.getElementById('output');
const state = {};

inputs.symbol.onkeyup = symbolUpdate;
inputs.atomicNumber.onkeyup = atomicNumberUpdate;
inputs.atomicMass.onkeyup = nucloensOrElectronsUpdate;
inputs.electronsPerShell.onkeyup = nucloensOrElectronsUpdate;
inputs.size.onkeyup = sizeUpdate;
inputs.size.onclick = sizeUpdate;

const download = document.getElementById('download');
download.onclick = function () {
  let DOMElement = document.querySelector('#output > *');
  saveAs(dom2blob(DOMElement), `${state.element.symbol}.svg`);
}
const downloadPNG = document.getElementById('download-png');
downloadPNG.onclick = function () {
  if (navigator.userAgent.search('Chrome') === -1) {
    alert('Saving as PNG only works with Chrome.');
  }
  let DOMElement = document.querySelector('#output > *');
  dom2image.toBlob(DOMElement)
    .then(blob => saveAs(blob, `${state.element.symbol}.png`))
    .catch(err => console.error(err));
}

symbolUpdate();

function symbolUpdate (event = {}) {
  if (event.keyCode === 9 || event.keyCode === 16) {
    // tab or shift, change of input field should not update symbol
    return;
  }
  let symbol = capitalize(inputs.symbol.value);
  let element = getElement({ type: 'symbol', value: symbol });
  if (!(symbol in periodicTable.symbols)) {
    // try only three, two or first chars
    let i = 3;
    while (i >= 1) {
      if (symbol.slice(0, i) in periodicTable.symbols) {
        element = getElement({ type: 'symbol', value: symbol.slice(0, i) });
        element.symbol = symbol;
        break;
      }
      i--;
    }
  }
  state.element = element;
  updateInputs(inputs);
  output.innerHTML = ChemicalElement(element);
}

function atomicNumberUpdate (event) {
  if (event.keyCode === 9 || event.keyCode === 16) {
    // tab or shift, change of input field should not update atomic number
    return;
  }
  let atomicNumber = inputs.atomicNumber.value;
  let element = getElement({ type: 'atomicNumber', value: atomicNumber });
  state.element = element;
  updateInputs(inputs);
  output.innerHTML = ChemicalElement(element);
}

function nucloensOrElectronsUpdate (event) {
  let values = readInputs(inputs);
  state.element.atomicMass = values.atomicMass;
  state.element.electronsPerShell = values.electronsPerShell;
  output.innerHTML = ChemicalElement(state.element);
}

function sizeUpdate (event) {
  let val = parseInt(inputs.size.value) || 14;
  let el = document.querySelector('#output > *');
  el.style.fontSize = val + 'px';
}

function updateInputs (inputs) {
  for (let key in inputs) {
    if (key === 'electronsPerShell') {
      inputs[key].value = state.element[key].join(',');
    } else if (key === 'size') {
      continue;
    } else {
      inputs[key].value = state.element[key];
    }
  }
}

function getElement (by) {
  let lookup = (by.type === 'symbol') ? 'symbols' : 'numbers';

  let element;
  if (periodicTable[lookup] && by.value in periodicTable[lookup]) {
    // avoid mutation of periodicTable -> copy
    element = Object.assign({}, periodicTable[lookup][by.value]);
    element.atomicMass = Array.isArray(element.atomicMass) ?
      element.atomicMass[0] : parseInt(element.atomicMass);
    element.electronsPerShell = electronsPerShell(element);
  } else {
    element = Object.assign({}, periodicTable.symbols.H, readInputs(inputs));
  }

  return element;
}

function capitalize (str) {
  return str.slice(0, 1).toUpperCase() + str.slice(1).toLowerCase();
}

function readInputs (inputs) {
  let values = {};
  for (let key in inputs) {
    if (key === 'electronsPerShell') {
      values[key] = inputs[key].value.split(',');
    } else {
      values[key] = inputs[key].value;
    }
  }
  return values;
}

function dom2blob (DOMElement) {
  let width = DOMElement.offsetWidth;
  let height = DOMElement.offsetHeight;

  let data = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">${DOMElement.outerHTML}</div>
      </foreignObject>
    </svg>`;

  return new Blob([data], {type: 'image/svg+xml'});
}

},{"./chemical-element.js":1,"./electrons-per-shell.js":2,"dom-to-image":4,"file-saver":5,"periodic-table":8}],4:[function(require,module,exports){
(function (global) {
    'use strict';

    var util = newUtil();
    var inliner = newInliner();
    var fontFaces = newFontFaces();
    var images = newImages();

    var domtoimage = {
        toSvg: toSvg,
        toPng: toPng,
        toJpeg: toJpeg,
        toBlob: toBlob,
        toPixelData: toPixelData,
        impl: {
            fontFaces: fontFaces,
            images: images,
            util: util,
            inliner: inliner
        }
    };

    if (typeof module !== 'undefined')
        module.exports = domtoimage;
    else
        global.domtoimage = domtoimage;


    /**
     * @param {Node} node - The DOM Node object to render
     * @param {Object} options - Rendering options
     * @param {Function} options.filter - Should return true if passed node should be included in the output
     *          (excluding node means excluding it's children as well). Not called on the root node.
     * @param {String} options.bgcolor - color for the background, any valid CSS color value.
     * @param {Number} options.width - width to be applied to node before rendering.
     * @param {Number} options.height - height to be applied to node before rendering.
     * @param {Object} options.style - an object whose properties to be copied to node's style before rendering.
     * @param {Number} options.quality - a Number between 0 and 1 indicating image quality (applicable to JPEG only),
                defaults to 1.0.
     * @return {Promise} - A promise that is fulfilled with a SVG image data URL
     * */
    function toSvg(node, options) {
        options = options || {};
        return Promise.resolve(node)
            .then(function (node) {
                return cloneNode(node, options.filter, true);
            })
            .then(embedFonts)
            .then(inlineImages)
            .then(applyOptions)
            .then(function (clone) {
                return makeSvgDataUri(clone,
                    options.width || util.width(node),
                    options.height || util.height(node)
                );
            });

        function applyOptions(clone) {
            if (options.bgcolor) clone.style.backgroundColor = options.bgcolor;

            if (options.width) clone.style.width = options.width + 'px';
            if (options.height) clone.style.height = options.height + 'px';

            if (options.style)
                Object.keys(options.style).forEach(function (property) {
                    clone.style[property] = options.style[property];
                });

            return clone;
        }
    }

    /**
     * @param {Node} node - The DOM Node object to render
     * @param {Object} options - Rendering options, @see {@link toSvg}
     * @return {Promise} - A promise that is fulfilled with a Uint8Array containing RGBA pixel data.
     * */
    function toPixelData(node, options) {
        return draw(node, options || {})
            .then(function (canvas) {
                return canvas.getContext('2d').getImageData(
                    0,
                    0,
                    util.width(node),
                    util.height(node)
                ).data;
            });
    }

    /**
     * @param {Node} node - The DOM Node object to render
     * @param {Object} options - Rendering options, @see {@link toSvg}
     * @return {Promise} - A promise that is fulfilled with a PNG image data URL
     * */
    function toPng(node, options) {
        return draw(node, options || {})
            .then(function (canvas) {
                return canvas.toDataURL();
            });
    }

    /**
     * @param {Node} node - The DOM Node object to render
     * @param {Object} options - Rendering options, @see {@link toSvg}
     * @return {Promise} - A promise that is fulfilled with a JPEG image data URL
     * */
    function toJpeg(node, options) {
        options = options || {};
        return draw(node, options)
            .then(function (canvas) {
                return canvas.toDataURL('image/jpeg', options.quality || 1.0);
            });
    }

    /**
     * @param {Node} node - The DOM Node object to render
     * @param {Object} options - Rendering options, @see {@link toSvg}
     * @return {Promise} - A promise that is fulfilled with a PNG image blob
     * */
    function toBlob(node, options) {
        return draw(node, options || {})
            .then(util.canvasToBlob);
    }

    function draw(domNode, options) {
        return toSvg(domNode, options)
            .then(util.makeImage)
            .then(util.delay(100))
            .then(function (image) {
                var canvas = newCanvas(domNode);
                canvas.getContext('2d').drawImage(image, 0, 0);
                return canvas;
            });

        function newCanvas(domNode) {
            var canvas = document.createElement('canvas');
            canvas.width = options.width || util.width(domNode);
            canvas.height = options.height || util.height(domNode);

            if (options.bgcolor) {
                var ctx = canvas.getContext('2d');
                ctx.fillStyle = options.bgcolor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            return canvas;
        }
    }

    function cloneNode(node, filter, root) {
        if (!root && filter && !filter(node)) return Promise.resolve();

        return Promise.resolve(node)
            .then(makeNodeCopy)
            .then(function (clone) {
                return cloneChildren(node, clone, filter);
            })
            .then(function (clone) {
                return processClone(node, clone);
            });

        function makeNodeCopy(node) {
            if (node instanceof HTMLCanvasElement) return util.makeImage(node.toDataURL());
            return node.cloneNode(false);
        }

        function cloneChildren(original, clone, filter) {
            var children = original.childNodes;
            if (children.length === 0) return Promise.resolve(clone);

            return cloneChildrenInOrder(clone, util.asArray(children), filter)
                .then(function () {
                    return clone;
                });

            function cloneChildrenInOrder(parent, children, filter) {
                var done = Promise.resolve();
                children.forEach(function (child) {
                    done = done
                        .then(function () {
                            return cloneNode(child, filter);
                        })
                        .then(function (childClone) {
                            if (childClone) parent.appendChild(childClone);
                        });
                });
                return done;
            }
        }

        function processClone(original, clone) {
            if (!(clone instanceof Element)) return clone;

            return Promise.resolve()
                .then(cloneStyle)
                .then(clonePseudoElements)
                .then(copyUserInput)
                .then(fixSvg)
                .then(function () {
                    return clone;
                });

            function cloneStyle() {
                copyStyle(window.getComputedStyle(original), clone.style);

                function copyStyle(source, target) {
                    if (source.cssText) target.cssText = source.cssText;
                    else copyProperties(source, target);

                    function copyProperties(source, target) {
                        util.asArray(source).forEach(function (name) {
                            target.setProperty(
                                name,
                                source.getPropertyValue(name),
                                source.getPropertyPriority(name)
                            );
                        });
                    }
                }
            }

            function clonePseudoElements() {
                [':before', ':after'].forEach(function (element) {
                    clonePseudoElement(element);
                });

                function clonePseudoElement(element) {
                    var style = window.getComputedStyle(original, element);
                    var content = style.getPropertyValue('content');

                    if (content === '' || content === 'none') return;

                    var className = util.uid();
                    clone.className = clone.className + ' ' + className;
                    var styleElement = document.createElement('style');
                    styleElement.appendChild(formatPseudoElementStyle(className, element, style));
                    clone.appendChild(styleElement);

                    function formatPseudoElementStyle(className, element, style) {
                        var selector = '.' + className + ':' + element;
                        var cssText = style.cssText ? formatCssText(style) : formatCssProperties(style);
                        return document.createTextNode(selector + '{' + cssText + '}');

                        function formatCssText(style) {
                            var content = style.getPropertyValue('content');
                            return style.cssText + ' content: ' + content + ';';
                        }

                        function formatCssProperties(style) {

                            return util.asArray(style)
                                .map(formatProperty)
                                .join('; ') + ';';

                            function formatProperty(name) {
                                return name + ': ' +
                                    style.getPropertyValue(name) +
                                    (style.getPropertyPriority(name) ? ' !important' : '');
                            }
                        }
                    }
                }
            }

            function copyUserInput() {
                if (original instanceof HTMLTextAreaElement) clone.innerHTML = original.value;
                if (original instanceof HTMLInputElement) clone.setAttribute("value", original.value);
            }

            function fixSvg() {
                if (!(clone instanceof SVGElement)) return;
                clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

                if (!(clone instanceof SVGRectElement)) return;
                ['width', 'height'].forEach(function (attribute) {
                    var value = clone.getAttribute(attribute);
                    if (!value) return;

                    clone.style.setProperty(attribute, value);
                });
            }
        }
    }

    function embedFonts(node) {
        return fontFaces.resolveAll()
            .then(function (cssText) {
                var styleNode = document.createElement('style');
                node.appendChild(styleNode);
                styleNode.appendChild(document.createTextNode(cssText));
                return node;
            });
    }

    function inlineImages(node) {
        return images.inlineAll(node)
            .then(function () {
                return node;
            });
    }

    function makeSvgDataUri(node, width, height) {
        return Promise.resolve(node)
            .then(function (node) {
                node.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
                return new XMLSerializer().serializeToString(node);
            })
            .then(util.escapeXhtml)
            .then(function (xhtml) {
                return '<foreignObject x="0" y="0" width="100%" height="100%">' + xhtml + '</foreignObject>';
            })
            .then(function (foreignObject) {
                return '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
                    foreignObject + '</svg>';
            })
            .then(function (svg) {
                return 'data:image/svg+xml;charset=utf-8,' + svg;
            });
    }

    function newUtil() {
        return {
            escape: escape,
            parseExtension: parseExtension,
            mimeType: mimeType,
            dataAsUrl: dataAsUrl,
            isDataUrl: isDataUrl,
            canvasToBlob: canvasToBlob,
            resolveUrl: resolveUrl,
            getAndEncode: getAndEncode,
            uid: uid(),
            delay: delay,
            asArray: asArray,
            escapeXhtml: escapeXhtml,
            makeImage: makeImage,
            width: width,
            height: height
        };

        function mimes() {
            /*
             * Only WOFF and EOT mime types for fonts are 'real'
             * see http://www.iana.org/assignments/media-types/media-types.xhtml
             */
            var WOFF = 'application/font-woff';
            var JPEG = 'image/jpeg';

            return {
                'woff': WOFF,
                'woff2': WOFF,
                'ttf': 'application/font-truetype',
                'eot': 'application/vnd.ms-fontobject',
                'png': 'image/png',
                'jpg': JPEG,
                'jpeg': JPEG,
                'gif': 'image/gif',
                'tiff': 'image/tiff',
                'svg': 'image/svg+xml'
            };
        }

        function parseExtension(url) {
            var match = /\.([^\.\/]*?)$/g.exec(url);
            if (match) return match[1];
            else return '';
        }

        function mimeType(url) {
            var extension = parseExtension(url).toLowerCase();
            return mimes()[extension] || '';
        }

        function isDataUrl(url) {
            return url.search(/^(data:)/) !== -1;
        }

        function toBlob(canvas) {
            return new Promise(function (resolve) {
                var binaryString = window.atob(canvas.toDataURL().split(',')[1]);
                var length = binaryString.length;
                var binaryArray = new Uint8Array(length);

                for (var i = 0; i < length; i++)
                    binaryArray[i] = binaryString.charCodeAt(i);

                resolve(new Blob([binaryArray], {
                    type: 'image/png'
                }));
            });
        }

        function canvasToBlob(canvas) {
            if (canvas.toBlob)
                return new Promise(function (resolve) {
                    canvas.toBlob(resolve);
                });

            return toBlob(canvas);
        }

        function resolveUrl(url, baseUrl) {
            var doc = document.implementation.createHTMLDocument();
            var base = doc.createElement('base');
            doc.head.appendChild(base);
            var a = doc.createElement('a');
            doc.body.appendChild(a);
            base.href = baseUrl;
            a.href = url;
            return a.href;
        }

        function uid() {
            var index = 0;

            return function () {
                return 'u' + fourRandomChars() + index++;

                function fourRandomChars() {
                    /* see http://stackoverflow.com/a/6248722/2519373 */
                    return ('0000' + (Math.random() * Math.pow(36, 4) << 0).toString(36)).slice(-4);
                }
            };
        }

        function makeImage(uri) {
            return new Promise(function (resolve, reject) {
                var image = new Image();
                image.onload = function () {
                    resolve(image);
                };
                image.onerror = reject;
                image.src = uri;
            });
        }

        function getAndEncode(url) {
            var TIMEOUT = 30000;

            return new Promise(function (resolve) {
                var request = new XMLHttpRequest();

                request.onreadystatechange = done;
                request.ontimeout = timeout;
                request.responseType = 'blob';
                request.timeout = TIMEOUT;
                request.open('GET', url, true);
                request.send();

                function done() {
                    if (request.readyState !== 4) return;

                    if (request.status !== 200) {
                        fail('cannot fetch resource: ' + url + ', status: ' + request.status);
                        return;
                    }

                    var encoder = new FileReader();
                    encoder.onloadend = function () {
                        var content = encoder.result.split(/,/)[1];
                        resolve(content);
                    };
                    encoder.readAsDataURL(request.response);
                }

                function timeout() {
                    fail('timeout of ' + TIMEOUT + 'ms occured while fetching resource: ' + url);
                }

                function fail(message) {
                    console.error(message);
                    resolve('');
                }
            });
        }

        function dataAsUrl(content, type) {
            return 'data:' + type + ';base64,' + content;
        }

        function escape(string) {
            return string.replace(/([.*+?^${}()|\[\]\/\\])/g, '\\$1');
        }

        function delay(ms) {
            return function (arg) {
                return new Promise(function (resolve) {
                    setTimeout(function () {
                        resolve(arg);
                    }, ms);
                });
            };
        }

        function asArray(arrayLike) {
            var array = [];
            var length = arrayLike.length;
            for (var i = 0; i < length; i++) array.push(arrayLike[i]);
            return array;
        }

        function escapeXhtml(string) {
            return string.replace(/#/g, '%23').replace(/\n/g, '%0A');
        }

        function width(node) {
            var leftBorder = px(node, 'border-left-width');
            var rightBorder = px(node, 'border-right-width');
            return node.scrollWidth + leftBorder + rightBorder;
        }

        function height(node) {
            var topBorder = px(node, 'border-top-width');
            var bottomBorder = px(node, 'border-bottom-width');
            return node.scrollHeight + topBorder + bottomBorder;
        }

        function px(node, styleProperty) {
            var value = window.getComputedStyle(node).getPropertyValue(styleProperty);
            return parseFloat(value.replace('px', ''));
        }
    }

    function newInliner() {
        var URL_REGEX = /url\(['"]?([^'"]+?)['"]?\)/g;

        return {
            inlineAll: inlineAll,
            shouldProcess: shouldProcess,
            impl: {
                readUrls: readUrls,
                inline: inline
            }
        };

        function shouldProcess(string) {
            return string.search(URL_REGEX) !== -1;
        }

        function readUrls(string) {
            var result = [];
            var match;
            while ((match = URL_REGEX.exec(string)) !== null) {
                result.push(match[1]);
            }
            return result.filter(function (url) {
                return !util.isDataUrl(url);
            });
        }

        function inline(string, url, baseUrl, get) {
            return Promise.resolve(url)
                .then(function (url) {
                    return baseUrl ? util.resolveUrl(url, baseUrl) : url;
                })
                .then(get || util.getAndEncode)
                .then(function (data) {
                    return util.dataAsUrl(data, util.mimeType(url));
                })
                .then(function (dataUrl) {
                    return string.replace(urlAsRegex(url), '$1' + dataUrl + '$3');
                });

            function urlAsRegex(url) {
                return new RegExp('(url\\([\'"]?)(' + util.escape(url) + ')([\'"]?\\))', 'g');
            }
        }

        function inlineAll(string, baseUrl, get) {
            if (nothingToInline()) return Promise.resolve(string);

            return Promise.resolve(string)
                .then(readUrls)
                .then(function (urls) {
                    var done = Promise.resolve(string);
                    urls.forEach(function (url) {
                        done = done.then(function (string) {
                            return inline(string, url, baseUrl, get);
                        });
                    });
                    return done;
                });

            function nothingToInline() {
                return !shouldProcess(string);
            }
        }
    }

    function newFontFaces() {
        return {
            resolveAll: resolveAll,
            impl: {
                readAll: readAll
            }
        };

        function resolveAll() {
            return readAll(document)
                .then(function (webFonts) {
                    return Promise.all(
                        webFonts.map(function (webFont) {
                            return webFont.resolve();
                        })
                    );
                })
                .then(function (cssStrings) {
                    return cssStrings.join('\n');
                });
        }

        function readAll() {
            return Promise.resolve(util.asArray(document.styleSheets))
                .then(getCssRules)
                .then(selectWebFontRules)
                .then(function (rules) {
                    return rules.map(newWebFont);
                });

            function selectWebFontRules(cssRules) {
                return cssRules
                    .filter(function (rule) {
                        return rule.type === CSSRule.FONT_FACE_RULE;
                    })
                    .filter(function (rule) {
                        return inliner.shouldProcess(rule.style.getPropertyValue('src'));
                    });
            }

            function getCssRules(styleSheets) {
                var cssRules = [];
                styleSheets.forEach(function (sheet) {
                    try {
                        util.asArray(sheet.cssRules || []).forEach(cssRules.push.bind(cssRules));
                    } catch (e) {
                        console.log('Error while reading CSS rules from ' + sheet.href, e.toString());
                    }
                });
                return cssRules;
            }

            function newWebFont(webFontRule) {
                return {
                    resolve: function resolve() {
                        var baseUrl = (webFontRule.parentStyleSheet || {}).href;
                        return inliner.inlineAll(webFontRule.cssText, baseUrl);
                    },
                    src: function () {
                        return webFontRule.style.getPropertyValue('src');
                    }
                };
            }
        }
    }

    function newImages() {
        return {
            inlineAll: inlineAll,
            impl: {
                newImage: newImage
            }
        };

        function newImage(element) {
            return {
                inline: inline
            };

            function inline(get) {
                if (util.isDataUrl(element.src)) return Promise.resolve();

                return Promise.resolve(element.src)
                    .then(get || util.getAndEncode)
                    .then(function (data) {
                        return util.dataAsUrl(data, util.mimeType(element.src));
                    })
                    .then(function (dataUrl) {
                        return new Promise(function (resolve, reject) {
                            element.onload = resolve;
                            element.onerror = reject;
                            element.src = dataUrl;
                        });
                    });
            }
        }

        function inlineAll(node) {
            if (!(node instanceof Element)) return Promise.resolve(node);

            return inlineBackground(node)
                .then(function () {
                    if (node instanceof HTMLImageElement)
                        return newImage(node).inline();
                    else
                        return Promise.all(
                            util.asArray(node.childNodes).map(function (child) {
                                return inlineAll(child);
                            })
                        );
                });

            function inlineBackground(node) {
                var background = node.style.getPropertyValue('background');

                if (!background) return Promise.resolve(node);

                return inliner.inlineAll(background)
                    .then(function (inlined) {
                        node.style.setProperty(
                            'background',
                            inlined,
                            node.style.getPropertyPriority('background')
                        );
                    })
                    .then(function () {
                        return node;
                    });
            }
        }
    }
})(this);

},{}],5:[function(require,module,exports){
/* FileSaver.js
 * A saveAs() FileSaver implementation.
 * 1.3.2
 * 2016-06-16 18:25:19
 *
 * By Eli Grey, http://eligrey.com
 * License: MIT
 *   See https://github.com/eligrey/FileSaver.js/blob/master/LICENSE.md
 */

/*global self */
/*jslint bitwise: true, indent: 4, laxbreak: true, laxcomma: true, smarttabs: true, plusplus: true */

/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */

var saveAs = saveAs || (function(view) {
	"use strict";
	// IE <10 is explicitly unsupported
	if (typeof view === "undefined" || typeof navigator !== "undefined" && /MSIE [1-9]\./.test(navigator.userAgent)) {
		return;
	}
	var
		  doc = view.document
		  // only get URL when necessary in case Blob.js hasn't overridden it yet
		, get_URL = function() {
			return view.URL || view.webkitURL || view;
		}
		, save_link = doc.createElementNS("http://www.w3.org/1999/xhtml", "a")
		, can_use_save_link = "download" in save_link
		, click = function(node) {
			var event = new MouseEvent("click");
			node.dispatchEvent(event);
		}
		, is_safari = /constructor/i.test(view.HTMLElement) || view.safari
		, is_chrome_ios =/CriOS\/[\d]+/.test(navigator.userAgent)
		, throw_outside = function(ex) {
			(view.setImmediate || view.setTimeout)(function() {
				throw ex;
			}, 0);
		}
		, force_saveable_type = "application/octet-stream"
		// the Blob API is fundamentally broken as there is no "downloadfinished" event to subscribe to
		, arbitrary_revoke_timeout = 1000 * 40 // in ms
		, revoke = function(file) {
			var revoker = function() {
				if (typeof file === "string") { // file is an object URL
					get_URL().revokeObjectURL(file);
				} else { // file is a File
					file.remove();
				}
			};
			setTimeout(revoker, arbitrary_revoke_timeout);
		}
		, dispatch = function(filesaver, event_types, event) {
			event_types = [].concat(event_types);
			var i = event_types.length;
			while (i--) {
				var listener = filesaver["on" + event_types[i]];
				if (typeof listener === "function") {
					try {
						listener.call(filesaver, event || filesaver);
					} catch (ex) {
						throw_outside(ex);
					}
				}
			}
		}
		, auto_bom = function(blob) {
			// prepend BOM for UTF-8 XML and text/* types (including HTML)
			// note: your browser will automatically convert UTF-16 U+FEFF to EF BB BF
			if (/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
				return new Blob([String.fromCharCode(0xFEFF), blob], {type: blob.type});
			}
			return blob;
		}
		, FileSaver = function(blob, name, no_auto_bom) {
			if (!no_auto_bom) {
				blob = auto_bom(blob);
			}
			// First try a.download, then web filesystem, then object URLs
			var
				  filesaver = this
				, type = blob.type
				, force = type === force_saveable_type
				, object_url
				, dispatch_all = function() {
					dispatch(filesaver, "writestart progress write writeend".split(" "));
				}
				// on any filesys errors revert to saving with object URLs
				, fs_error = function() {
					if ((is_chrome_ios || (force && is_safari)) && view.FileReader) {
						// Safari doesn't allow downloading of blob urls
						var reader = new FileReader();
						reader.onloadend = function() {
							var url = is_chrome_ios ? reader.result : reader.result.replace(/^data:[^;]*;/, 'data:attachment/file;');
							var popup = view.open(url, '_blank');
							if(!popup) view.location.href = url;
							url=undefined; // release reference before dispatching
							filesaver.readyState = filesaver.DONE;
							dispatch_all();
						};
						reader.readAsDataURL(blob);
						filesaver.readyState = filesaver.INIT;
						return;
					}
					// don't create more object URLs than needed
					if (!object_url) {
						object_url = get_URL().createObjectURL(blob);
					}
					if (force) {
						view.location.href = object_url;
					} else {
						var opened = view.open(object_url, "_blank");
						if (!opened) {
							// Apple does not allow window.open, see https://developer.apple.com/library/safari/documentation/Tools/Conceptual/SafariExtensionGuide/WorkingwithWindowsandTabs/WorkingwithWindowsandTabs.html
							view.location.href = object_url;
						}
					}
					filesaver.readyState = filesaver.DONE;
					dispatch_all();
					revoke(object_url);
				}
			;
			filesaver.readyState = filesaver.INIT;

			if (can_use_save_link) {
				object_url = get_URL().createObjectURL(blob);
				setTimeout(function() {
					save_link.href = object_url;
					save_link.download = name;
					click(save_link);
					dispatch_all();
					revoke(object_url);
					filesaver.readyState = filesaver.DONE;
				});
				return;
			}

			fs_error();
		}
		, FS_proto = FileSaver.prototype
		, saveAs = function(blob, name, no_auto_bom) {
			return new FileSaver(blob, name || blob.name || "download", no_auto_bom);
		}
	;
	// IE 10+ (native saveAs)
	if (typeof navigator !== "undefined" && navigator.msSaveOrOpenBlob) {
		return function(blob, name, no_auto_bom) {
			name = name || blob.name || "download";

			if (!no_auto_bom) {
				blob = auto_bom(blob);
			}
			return navigator.msSaveOrOpenBlob(blob, name);
		};
	}

	FS_proto.abort = function(){};
	FS_proto.readyState = FS_proto.INIT = 0;
	FS_proto.WRITING = 1;
	FS_proto.DONE = 2;

	FS_proto.error =
	FS_proto.onwritestart =
	FS_proto.onprogress =
	FS_proto.onwrite =
	FS_proto.onabort =
	FS_proto.onerror =
	FS_proto.onwriteend =
		null;

	return saveAs;
}(
	   typeof self !== "undefined" && self
	|| typeof window !== "undefined" && window
	|| this.content
));
// `self` is undefined in Firefox for Android content script context
// while `this` is nsIContentFrameMessageManager
// with an attribute `content` that corresponds to the window

if (typeof module !== "undefined" && module.exports) {
  module.exports.saveAs = saveAs;
} else if ((typeof define !== "undefined" && define !== null) && (define.amd !== null)) {
  define("FileSaver.js", function() {
    return saveAs;
  });
}

},{}],6:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":9}],7:[function(require,module,exports){
module.exports=[
{"atomicNumber":1,"symbol":"H","name":"Hydrogen","atomicMass":"1.00794(4)","cpkHexColor":"FFFFFF","electronicConfiguration":"1s1","electronegativity":2.2,"atomicRadius":37,"ionRadius":"","vanDelWaalsRadius":120,"ionizationEnergy":1312,"electronAffinity":-73,"oxidationStates":"-1, 1","standardState":"gas","bondingType":"diatomic","meltingPoint":14,"boilingPoint":20,"density":0.0000899,"groupBlock":"nonmetal","yearDiscovered":1766},
{"atomicNumber":2,"symbol":"He","name":"Helium","atomicMass":"4.002602(2)","cpkHexColor":"D9FFFF","electronicConfiguration":"1s2","electronegativity":"","atomicRadius":32,"ionRadius":"","vanDelWaalsRadius":140,"ionizationEnergy":2372,"electronAffinity":0,"oxidationStates":"","standardState":"gas","bondingType":"atomic","meltingPoint":"","boilingPoint":4,"density":0.0001785,"groupBlock":"noble gas","yearDiscovered":1868},
{"atomicNumber":3,"symbol":"Li","name":"Lithium","atomicMass":"6.941(2)","cpkHexColor":"CC80FF","electronicConfiguration":"[He] 2s1","electronegativity":0.98,"atomicRadius":134,"ionRadius":"76 (+1)","vanDelWaalsRadius":182,"ionizationEnergy":520,"electronAffinity":-60,"oxidationStates":1,"standardState":"solid","bondingType":"metallic","meltingPoint":454,"boilingPoint":1615,"density":0.535,"groupBlock":"alkali metal","yearDiscovered":1817},
{"atomicNumber":4,"symbol":"Be","name":"Beryllium","atomicMass":"9.012182(3)","cpkHexColor":"C2FF00","electronicConfiguration":"[He] 2s2","electronegativity":1.57,"atomicRadius":90,"ionRadius":"45 (+2)","vanDelWaalsRadius":"","ionizationEnergy":900,"electronAffinity":0,"oxidationStates":2,"standardState":"solid","bondingType":"metallic","meltingPoint":1560,"boilingPoint":2743,"density":1.848,"groupBlock":"alkaline earth metal","yearDiscovered":1798},
{"atomicNumber":5,"symbol":"B","name":"Boron","atomicMass":"10.811(7)","cpkHexColor":"FFB5B5","electronicConfiguration":"[He] 2s2 2p1","electronegativity":2.04,"atomicRadius":82,"ionRadius":"27 (+3)","vanDelWaalsRadius":"","ionizationEnergy":801,"electronAffinity":-27,"oxidationStates":"1, 2, 3","standardState":"solid","bondingType":"covalent network","meltingPoint":2348,"boilingPoint":4273,"density":2.46,"groupBlock":"metalloid","yearDiscovered":1807},
{"atomicNumber":6,"symbol":"C","name":"Carbon","atomicMass":"12.0107(8)","cpkHexColor":909090,"electronicConfiguration":"[He] 2s2 2p2","electronegativity":2.55,"atomicRadius":77,"ionRadius":"16 (+4)","vanDelWaalsRadius":170,"ionizationEnergy":1087,"electronAffinity":-154,"oxidationStates":"-4, -3, -2, -1, 1, 2, 3, 4","standardState":"solid","bondingType":"covalent network","meltingPoint":3823,"boilingPoint":4300,"density":2.26,"groupBlock":"nonmetal","yearDiscovered":"Ancient"},
{"atomicNumber":7,"symbol":"N","name":"Nitrogen","atomicMass":"14.0067(2)","cpkHexColor":"3050F8","electronicConfiguration":"[He] 2s2 2p3","electronegativity":3.04,"atomicRadius":75,"ionRadius":"146 (-3)","vanDelWaalsRadius":155,"ionizationEnergy":1402,"electronAffinity":-7,"oxidationStates":"-3, -2, -1, 1, 2, 3, 4, 5","standardState":"gas","bondingType":"diatomic","meltingPoint":63,"boilingPoint":77,"density":0.001251,"groupBlock":"nonmetal","yearDiscovered":1772},
{"atomicNumber":8,"symbol":"O","name":"Oxygen","atomicMass":"15.9994(3)","cpkHexColor":"FF0D0D","electronicConfiguration":"[He] 2s2 2p4","electronegativity":3.44,"atomicRadius":73,"ionRadius":"140 (-2)","vanDelWaalsRadius":152,"ionizationEnergy":1314,"electronAffinity":-141,"oxidationStates":"-2, -1, 1, 2","standardState":"gas","bondingType":"diatomic","meltingPoint":55,"boilingPoint":90,"density":0.001429,"groupBlock":"nonmetal","yearDiscovered":1774},
{"atomicNumber":9,"symbol":"F","name":"Fluorine","atomicMass":"18.9984032(5)","cpkHexColor":9e+51,"electronicConfiguration":"[He] 2s2 2p5","electronegativity":3.98,"atomicRadius":71,"ionRadius":"133 (-1)","vanDelWaalsRadius":147,"ionizationEnergy":1681,"electronAffinity":-328,"oxidationStates":-1,"standardState":"gas","bondingType":"atomic","meltingPoint":54,"boilingPoint":85,"density":0.001696,"groupBlock":"halogen","yearDiscovered":1670},
{"atomicNumber":10,"symbol":"Ne","name":"Neon","atomicMass":"20.1797(6)","cpkHexColor":"B3E3F5","electronicConfiguration":"[He] 2s2 2p6","electronegativity":"","atomicRadius":69,"ionRadius":"","vanDelWaalsRadius":154,"ionizationEnergy":2081,"electronAffinity":0,"oxidationStates":"","standardState":"gas","bondingType":"atomic","meltingPoint":25,"boilingPoint":27,"density":0.0009,"groupBlock":"noble gas","yearDiscovered":1898},
{"atomicNumber":11,"symbol":"Na","name":"Sodium","atomicMass":"22.98976928(2)","cpkHexColor":"AB5CF2","electronicConfiguration":"[Ne] 3s1","electronegativity":0.93,"atomicRadius":154,"ionRadius":"102 (+1)","vanDelWaalsRadius":227,"ionizationEnergy":496,"electronAffinity":-53,"oxidationStates":"-1, 1","standardState":"solid","bondingType":"metallic","meltingPoint":371,"boilingPoint":1156,"density":0.968,"groupBlock":"alkali metal","yearDiscovered":1807},
{"atomicNumber":12,"symbol":"Mg","name":"Magnesium","atomicMass":"24.3050(6)","cpkHexColor":"8AFF00","electronicConfiguration":"[Ne] 3s2","electronegativity":1.31,"atomicRadius":130,"ionRadius":"72 (+2)","vanDelWaalsRadius":173,"ionizationEnergy":738,"electronAffinity":0,"oxidationStates":"1, 2","standardState":"solid","bondingType":"metallic","meltingPoint":923,"boilingPoint":1363,"density":1.738,"groupBlock":"alkaline earth metal","yearDiscovered":1808},
{"atomicNumber":13,"symbol":"Al","name":"Aluminum","atomicMass":"26.9815386(8)","cpkHexColor":"BFA6A6","electronicConfiguration":"[Ne] 3s2 3p1","electronegativity":1.61,"atomicRadius":118,"ionRadius":"53.5 (+3)","vanDelWaalsRadius":"","ionizationEnergy":578,"electronAffinity":-43,"oxidationStates":"1, 3","standardState":"solid","bondingType":"metallic","meltingPoint":933,"boilingPoint":2792,"density":2.7,"groupBlock":"metal","yearDiscovered":"Ancient"},
{"atomicNumber":14,"symbol":"Si","name":"Silicon","atomicMass":"28.0855(3)","cpkHexColor":"F0C8A0","electronicConfiguration":"[Ne] 3s2 3p2","electronegativity":1.9,"atomicRadius":111,"ionRadius":"40 (+4)","vanDelWaalsRadius":210,"ionizationEnergy":787,"electronAffinity":-134,"oxidationStates":"-4, -3, -2, -1, 1, 2, 3, 4","standardState":"solid","bondingType":"metallic","meltingPoint":1687,"boilingPoint":3173,"density":2.33,"groupBlock":"metalloid","yearDiscovered":1854},
{"atomicNumber":15,"symbol":"P","name":"Phosphorus","atomicMass":"30.973762(2)","cpkHexColor":"FF8000","electronicConfiguration":"[Ne] 3s2 3p3","electronegativity":2.19,"atomicRadius":106,"ionRadius":"44 (+3)","vanDelWaalsRadius":180,"ionizationEnergy":1012,"electronAffinity":-72,"oxidationStates":"-3, -2, -1, 1, 2, 3, 4, 5","standardState":"solid","bondingType":"covalent network","meltingPoint":317,"boilingPoint":554,"density":1.823,"groupBlock":"nonmetal","yearDiscovered":1669},
{"atomicNumber":16,"symbol":"S","name":"Sulfur","atomicMass":"32.065(5)","cpkHexColor":"FFFF30","electronicConfiguration":"[Ne] 3s2 3p4","electronegativity":2.58,"atomicRadius":102,"ionRadius":"184 (-2)","vanDelWaalsRadius":180,"ionizationEnergy":1000,"electronAffinity":-200,"oxidationStates":"-2, -1, 1, 2, 3, 4, 5, 6","standardState":"solid","bondingType":"covalent network","meltingPoint":388,"boilingPoint":718,"density":1.96,"groupBlock":"nonmetal","yearDiscovered":"Ancient"},
{"atomicNumber":17,"symbol":"Cl","name":"Chlorine","atomicMass":"35.453(2)","cpkHexColor":"1FF01F","electronicConfiguration":"[Ne] 3s2 3p5","electronegativity":3.16,"atomicRadius":99,"ionRadius":"181 (-1)","vanDelWaalsRadius":175,"ionizationEnergy":1251,"electronAffinity":-349,"oxidationStates":"-1, 1, 2, 3, 4, 5, 6, 7","standardState":"gas","bondingType":"covalent network","meltingPoint":172,"boilingPoint":239,"density":0.003214,"groupBlock":"halogen","yearDiscovered":1774},
{"atomicNumber":18,"symbol":"Ar","name":"Argon","atomicMass":"39.948(1)","cpkHexColor":"80D1E3","electronicConfiguration":"[Ne] 3s2 3p6","electronegativity":"","atomicRadius":97,"ionRadius":"","vanDelWaalsRadius":188,"ionizationEnergy":1521,"electronAffinity":0,"oxidationStates":"","standardState":"gas","bondingType":"atomic","meltingPoint":84,"boilingPoint":87,"density":0.001784,"groupBlock":"noble gas","yearDiscovered":1894},
{"atomicNumber":19,"symbol":"K","name":"Potassium","atomicMass":"39.0983(1)","cpkHexColor":"8F40D4","electronicConfiguration":"[Ar] 4s1","electronegativity":0.82,"atomicRadius":196,"ionRadius":"138 (+1)","vanDelWaalsRadius":275,"ionizationEnergy":419,"electronAffinity":-48,"oxidationStates":1,"standardState":"solid","bondingType":"metallic","meltingPoint":337,"boilingPoint":1032,"density":0.856,"groupBlock":"alkali metal","yearDiscovered":1807},
{"atomicNumber":20,"symbol":"Ca","name":"Calcium","atomicMass":"40.078(4)","cpkHexColor":"3DFF00","electronicConfiguration":"[Ar] 4s2","electronegativity":1,"atomicRadius":174,"ionRadius":"100 (+2)","vanDelWaalsRadius":"","ionizationEnergy":590,"electronAffinity":-2,"oxidationStates":2,"standardState":"solid","bondingType":"metallic","meltingPoint":1115,"boilingPoint":1757,"density":1.55,"groupBlock":"alkaline earth metal","yearDiscovered":"Ancient"},
{"atomicNumber":21,"symbol":"Sc","name":"Scandium","atomicMass":"44.955912(6)","cpkHexColor":"E6E6E6","electronicConfiguration":"[Ar] 3d1 4s2","electronegativity":1.36,"atomicRadius":144,"ionRadius":"74.5 (+3)","vanDelWaalsRadius":"","ionizationEnergy":633,"electronAffinity":-18,"oxidationStates":"1, 2, 3","standardState":"solid","bondingType":"metallic","meltingPoint":1814,"boilingPoint":3103,"density":2.985,"groupBlock":"transition metal","yearDiscovered":1876},
{"atomicNumber":22,"symbol":"Ti","name":"Titanium","atomicMass":"47.867(1)","cpkHexColor":"BFC2C7","electronicConfiguration":"[Ar] 3d2 4s2","electronegativity":1.54,"atomicRadius":136,"ionRadius":"86 (+2)","vanDelWaalsRadius":"","ionizationEnergy":659,"electronAffinity":-8,"oxidationStates":"-1, 2, 3, 4","standardState":"solid","bondingType":"metallic","meltingPoint":1941,"boilingPoint":3560,"density":4.507,"groupBlock":"transition metal","yearDiscovered":1791},
{"atomicNumber":23,"symbol":"V","name":"Vanadium","atomicMass":"50.9415(1)","cpkHexColor":"A6A6AB","electronicConfiguration":"[Ar] 3d3 4s2","electronegativity":1.63,"atomicRadius":125,"ionRadius":"79 (+2)","vanDelWaalsRadius":"","ionizationEnergy":651,"electronAffinity":-51,"oxidationStates":"-1, 2, 3, 4","standardState":"solid","bondingType":"metallic","meltingPoint":2183,"boilingPoint":3680,"density":6.11,"groupBlock":"transition metal","yearDiscovered":1803},
{"atomicNumber":24,"symbol":"Cr","name":"Chromium","atomicMass":"51.9961(6)","cpkHexColor":"8A99C7","electronicConfiguration":"[Ar] 3d5 4s1","electronegativity":1.66,"atomicRadius":127,"ionRadius":"80 (+2*)","vanDelWaalsRadius":"","ionizationEnergy":653,"electronAffinity":-64,"oxidationStates":"-2, -1, 1, 2, 3, 4, 5, 6","standardState":"solid","bondingType":"metallic","meltingPoint":2180,"boilingPoint":2944,"density":7.14,"groupBlock":"transition metal","yearDiscovered":"Ancient"},
{"atomicNumber":25,"symbol":"Mn","name":"Manganese","atomicMass":"54.938045(5)","cpkHexColor":"9C7AC7","electronicConfiguration":"[Ar] 3d5 4s2","electronegativity":1.55,"atomicRadius":139,"ionRadius":"67 (+2)","vanDelWaalsRadius":"","ionizationEnergy":717,"electronAffinity":0,"oxidationStates":"-3, -2, -1, 1, 2, 3, 4, 5, 6, 7","standardState":"solid","bondingType":"metallic","meltingPoint":1519,"boilingPoint":2334,"density":7.47,"groupBlock":"transition metal","yearDiscovered":1774},
{"atomicNumber":26,"symbol":"Fe","name":"Iron","atomicMass":"55.845(2)","cpkHexColor":"E06633","electronicConfiguration":"[Ar] 3d6 4s2","electronegativity":1.83,"atomicRadius":125,"ionRadius":"78 (+2*)","vanDelWaalsRadius":"","ionizationEnergy":763,"electronAffinity":-16,"oxidationStates":"-2, -1, 1, 2, 3, 4, 5, 6","standardState":"solid","bondingType":"metallic","meltingPoint":1811,"boilingPoint":3134,"density":7.874,"groupBlock":"transition metal","yearDiscovered":"Ancient"},
{"atomicNumber":27,"symbol":"Co","name":"Cobalt","atomicMass":"58.933195(5)","cpkHexColor":"F090A0","electronicConfiguration":"[Ar] 3d7 4s2","electronegativity":1.88,"atomicRadius":126,"ionRadius":"74.5 (+2*)","vanDelWaalsRadius":"","ionizationEnergy":760,"electronAffinity":-64,"oxidationStates":"-1, 1, 2, 3, 4, 5","standardState":"solid","bondingType":"metallic","meltingPoint":1768,"boilingPoint":3200,"density":8.9,"groupBlock":"transition metal","yearDiscovered":"Ancient"},
{"atomicNumber":28,"symbol":"Ni","name":"Nickel","atomicMass":"58.6934(4)","cpkHexColor":"50D050","electronicConfiguration":"[Ar] 3d8 4s2","electronegativity":1.91,"atomicRadius":121,"ionRadius":"69 (+2)","vanDelWaalsRadius":163,"ionizationEnergy":737,"electronAffinity":-112,"oxidationStates":"-1, 1, 2, 3, 4","standardState":"solid","bondingType":"metallic","meltingPoint":1728,"boilingPoint":3186,"density":8.908,"groupBlock":"transition metal","yearDiscovered":1751},
{"atomicNumber":29,"symbol":"Cu","name":"Copper","atomicMass":"63.546(3)","cpkHexColor":"C88033","electronicConfiguration":"[Ar] 3d10 4s1","electronegativity":1.9,"atomicRadius":138,"ionRadius":"77 (+1)","vanDelWaalsRadius":140,"ionizationEnergy":746,"electronAffinity":-118,"oxidationStates":"1, 2, 3, 4","standardState":"solid","bondingType":"metallic","meltingPoint":1358,"boilingPoint":3200,"density":8.92,"groupBlock":"transition metal","yearDiscovered":"Ancient"},
{"atomicNumber":30,"symbol":"Zn","name":"Zinc","atomicMass":"65.38(2)","cpkHexColor":"7D80B0","electronicConfiguration":"[Ar] 3d10 4s2","electronegativity":1.65,"atomicRadius":131,"ionRadius":"74 (+2)","vanDelWaalsRadius":139,"ionizationEnergy":906,"electronAffinity":0,"oxidationStates":2,"standardState":"solid","bondingType":"metallic","meltingPoint":693,"boilingPoint":1180,"density":7.14,"groupBlock":"transition metal","yearDiscovered":1746},
{"atomicNumber":31,"symbol":"Ga","name":"Gallium","atomicMass":"69.723(1)","cpkHexColor":"C28F8F","electronicConfiguration":"[Ar] 3d10 4s2 4p1","electronegativity":1.81,"atomicRadius":126,"ionRadius":"62 (+3)","vanDelWaalsRadius":187,"ionizationEnergy":579,"electronAffinity":-29,"oxidationStates":"1, 2, 3","standardState":"solid","bondingType":"metallic","meltingPoint":303,"boilingPoint":2477,"density":5.904,"groupBlock":"metal","yearDiscovered":1875},
{"atomicNumber":32,"symbol":"Ge","name":"Germanium","atomicMass":"72.64(1)","cpkHexColor":"668F8F","electronicConfiguration":"[Ar] 3d10 4s2 4p2","electronegativity":2.01,"atomicRadius":122,"ionRadius":"73 (+2)","vanDelWaalsRadius":"","ionizationEnergy":762,"electronAffinity":-119,"oxidationStates":"-4, 1, 2, 3, 4","standardState":"solid","bondingType":"metallic","meltingPoint":1211,"boilingPoint":3093,"density":5.323,"groupBlock":"metalloid","yearDiscovered":1886},
{"atomicNumber":33,"symbol":"As","name":"Arsenic","atomicMass":"74.92160(2)","cpkHexColor":"BD80E3","electronicConfiguration":"[Ar] 3d10 4s2 4p3","electronegativity":2.18,"atomicRadius":119,"ionRadius":"58 (+3)","vanDelWaalsRadius":185,"ionizationEnergy":947,"electronAffinity":-78,"oxidationStates":"-3, 2, 3, 5","standardState":"solid","bondingType":"metallic","meltingPoint":1090,"boilingPoint":887,"density":5.727,"groupBlock":"metalloid","yearDiscovered":"Ancient"},
{"atomicNumber":34,"symbol":"Se","name":"Selenium","atomicMass":"78.96(3)","cpkHexColor":"FFA100","electronicConfiguration":"[Ar] 3d10 4s2 4p4","electronegativity":2.55,"atomicRadius":116,"ionRadius":"198 (-2)","vanDelWaalsRadius":190,"ionizationEnergy":941,"electronAffinity":-195,"oxidationStates":"-2, 2, 4, 6","standardState":"solid","bondingType":"metallic","meltingPoint":494,"boilingPoint":958,"density":4.819,"groupBlock":"nonmetal","yearDiscovered":1817},
{"atomicNumber":35,"symbol":"Br","name":"Bromine","atomicMass":"79.904(1)","cpkHexColor":"A62929","electronicConfiguration":"[Ar] 3d10 4s2 4p5","electronegativity":2.96,"atomicRadius":114,"ionRadius":"196 (-1)","vanDelWaalsRadius":185,"ionizationEnergy":1140,"electronAffinity":-325,"oxidationStates":"-1, 1, 3, 4, 5, 7","standardState":"liquid","bondingType":"covalent network","meltingPoint":266,"boilingPoint":332,"density":3.12,"groupBlock":"halogen","yearDiscovered":1826},
{"atomicNumber":36,"symbol":"Kr","name":"Krypton","atomicMass":"83.798(2)","cpkHexColor":"5CB8D1","electronicConfiguration":"[Ar] 3d10 4s2 4p6","electronegativity":"","atomicRadius":110,"ionRadius":"","vanDelWaalsRadius":202,"ionizationEnergy":1351,"electronAffinity":0,"oxidationStates":2,"standardState":"gas","bondingType":"atomic","meltingPoint":116,"boilingPoint":120,"density":0.00375,"groupBlock":"noble gas","yearDiscovered":1898},
{"atomicNumber":37,"symbol":"Rb","name":"Rubidium","atomicMass":"85.4678(3)","cpkHexColor":"702EB0","electronicConfiguration":"[Kr] 5s1","electronegativity":0.82,"atomicRadius":211,"ionRadius":"152 (+1)","vanDelWaalsRadius":"","ionizationEnergy":403,"electronAffinity":-47,"oxidationStates":1,"standardState":"solid","bondingType":"metallic","meltingPoint":312,"boilingPoint":961,"density":1.532,"groupBlock":"alkali metal","yearDiscovered":1861},
{"atomicNumber":38,"symbol":"Sr","name":"Strontium","atomicMass":"87.62(1)","cpkHexColor":"00FF00","electronicConfiguration":"[Kr] 5s2","electronegativity":0.95,"atomicRadius":192,"ionRadius":"118 (+2)","vanDelWaalsRadius":"","ionizationEnergy":550,"electronAffinity":-5,"oxidationStates":2,"standardState":"solid","bondingType":"metallic","meltingPoint":1050,"boilingPoint":1655,"density":2.63,"groupBlock":"alkaline earth metal","yearDiscovered":1790},
{"atomicNumber":39,"symbol":"Y","name":"Yttrium","atomicMass":"88.90585(2)","cpkHexColor":"94FFFF","electronicConfiguration":"[Kr] 4d1 5s2","electronegativity":1.22,"atomicRadius":162,"ionRadius":"90 (+3)","vanDelWaalsRadius":"","ionizationEnergy":600,"electronAffinity":-30,"oxidationStates":"1, 2, 3","standardState":"solid","bondingType":"metallic","meltingPoint":1799,"boilingPoint":3618,"density":4.472,"groupBlock":"transition metal","yearDiscovered":1794},
{"atomicNumber":40,"symbol":"Zr","name":"Zirconium","atomicMass":"91.224(2)","cpkHexColor":"94E0E0","electronicConfiguration":"[Kr] 4d2 5s2","electronegativity":1.33,"atomicRadius":148,"ionRadius":"72 (+4)","vanDelWaalsRadius":"","ionizationEnergy":640,"electronAffinity":-41,"oxidationStates":"1, 2, 3, 4","standardState":"solid","bondingType":"metallic","meltingPoint":2128,"boilingPoint":4682,"density":6.511,"groupBlock":"transition metal","yearDiscovered":1789},
{"atomicNumber":41,"symbol":"Nb","name":"Niobium","atomicMass":"92.90638(2)","cpkHexColor":"73C2C9","electronicConfiguration":"[Kr] 4d4 5s1","electronegativity":1.6,"atomicRadius":137,"ionRadius":"72 (+3)","vanDelWaalsRadius":"","ionizationEnergy":652,"electronAffinity":-86,"oxidationStates":"-1, 2, 3, 4, 5","standardState":"solid","bondingType":"metallic","meltingPoint":2750,"boilingPoint":5017,"density":8.57,"groupBlock":"transition metal","yearDiscovered":1801},
{"atomicNumber":42,"symbol":"Mo","name":"Molybdenum","atomicMass":"95.96(2)","cpkHexColor":"54B5B5","electronicConfiguration":"[Kr] 4d5 5s1","electronegativity":2.16,"atomicRadius":145,"ionRadius":"69 (+3)","vanDelWaalsRadius":"","ionizationEnergy":684,"electronAffinity":-72,"oxidationStates":"-2, -1, 1, 2, 3, 4, 5, 6","standardState":"solid","bondingType":"metallic","meltingPoint":2896,"boilingPoint":4912,"density":10.28,"groupBlock":"transition metal","yearDiscovered":1778},
{"atomicNumber":43,"symbol":"Tc","name":"Technetium","atomicMass":[98],"cpkHexColor":"3B9E9E","electronicConfiguration":"[Kr] 4d5 5s2","electronegativity":1.9,"atomicRadius":156,"ionRadius":"64.5 (+4)","vanDelWaalsRadius":"","ionizationEnergy":702,"electronAffinity":-53,"oxidationStates":"-3, -1, 1, 2, 3, 4, 5, 6, 7","standardState":"solid","bondingType":"metallic","meltingPoint":2430,"boilingPoint":4538,"density":11.5,"groupBlock":"transition metal","yearDiscovered":1937},
{"atomicNumber":44,"symbol":"Ru","name":"Ruthenium","atomicMass":"101.07(2)","cpkHexColor":"248F8F","electronicConfiguration":"[Kr] 4d7 5s1","electronegativity":2.2,"atomicRadius":126,"ionRadius":"68 (+3)","vanDelWaalsRadius":"","ionizationEnergy":710,"electronAffinity":-101,"oxidationStates":"-2, 1, 2, 3, 4, 5, 6, 7, 8","standardState":"solid","bondingType":"metallic","meltingPoint":2607,"boilingPoint":4423,"density":12.37,"groupBlock":"transition metal","yearDiscovered":1827},
{"atomicNumber":45,"symbol":"Rh","name":"Rhodium","atomicMass":"102.90550(2)","cpkHexColor":"0A7D8C","electronicConfiguration":"[Kr] 4d8 5s1","electronegativity":2.28,"atomicRadius":135,"ionRadius":"66.5 (+3)","vanDelWaalsRadius":"","ionizationEnergy":720,"electronAffinity":-110,"oxidationStates":"-1, 1, 2, 3, 4, 5, 6","standardState":"solid","bondingType":"metallic","meltingPoint":2237,"boilingPoint":3968,"density":12.45,"groupBlock":"transition metal","yearDiscovered":1803},
{"atomicNumber":46,"symbol":"Pd","name":"Palladium","atomicMass":"106.42(1)","cpkHexColor":6985,"electronicConfiguration":"[Kr] 4d10","electronegativity":2.2,"atomicRadius":131,"ionRadius":"59 (+1)","vanDelWaalsRadius":163,"ionizationEnergy":804,"electronAffinity":-54,"oxidationStates":"2, 4","standardState":"solid","bondingType":"metallic","meltingPoint":1828,"boilingPoint":3236,"density":12.023,"groupBlock":"transition metal","yearDiscovered":1803},
{"atomicNumber":47,"symbol":"Ag","name":"Silver","atomicMass":"107.8682(2)","cpkHexColor":"C0C0C0","electronicConfiguration":"[Kr] 4d10 5s1","electronegativity":1.93,"atomicRadius":153,"ionRadius":"115 (+1)","vanDelWaalsRadius":172,"ionizationEnergy":731,"electronAffinity":-126,"oxidationStates":"1, 2, 3","standardState":"solid","bondingType":"metallic","meltingPoint":1235,"boilingPoint":2435,"density":10.49,"groupBlock":"transition metal","yearDiscovered":"Ancient"},
{"atomicNumber":48,"symbol":"Cd","name":"Cadmium","atomicMass":"112.411(8)","cpkHexColor":"FFD98F","electronicConfiguration":"[Kr] 4d10 5s2","electronegativity":1.69,"atomicRadius":148,"ionRadius":"95 (+2)","vanDelWaalsRadius":158,"ionizationEnergy":868,"electronAffinity":0,"oxidationStates":2,"standardState":"solid","bondingType":"metallic","meltingPoint":594,"boilingPoint":1040,"density":8.65,"groupBlock":"transition metal","yearDiscovered":1817},
{"atomicNumber":49,"symbol":"In","name":"Indium","atomicMass":"114.818(3)","cpkHexColor":"A67573","electronicConfiguration":"[Kr] 4d10 5s2 5p1","electronegativity":1.78,"atomicRadius":144,"ionRadius":"80 (+3)","vanDelWaalsRadius":193,"ionizationEnergy":558,"electronAffinity":-29,"oxidationStates":"1, 2, 3","standardState":"solid","bondingType":"metallic","meltingPoint":430,"boilingPoint":2345,"density":7.31,"groupBlock":"metal","yearDiscovered":1863},
{"atomicNumber":50,"symbol":"Sn","name":"Tin","atomicMass":"118.710(7)","cpkHexColor":668080,"electronicConfiguration":"[Kr] 4d10 5s2 5p2","electronegativity":1.96,"atomicRadius":141,"ionRadius":"112 (+2)","vanDelWaalsRadius":217,"ionizationEnergy":709,"electronAffinity":-107,"oxidationStates":"-4, 2, 4","standardState":"solid","bondingType":"metallic","meltingPoint":505,"boilingPoint":2875,"density":7.31,"groupBlock":"metal","yearDiscovered":"Ancient"},
{"atomicNumber":51,"symbol":"Sb","name":"Antimony","atomicMass":"121.760(1)","cpkHexColor":"9E63B5","electronicConfiguration":"[Kr] 4d10 5s2 5p3","electronegativity":2.05,"atomicRadius":138,"ionRadius":"76 (+3)","vanDelWaalsRadius":"","ionizationEnergy":834,"electronAffinity":-103,"oxidationStates":"-3, 3, 5","standardState":"solid","bondingType":"metallic","meltingPoint":904,"boilingPoint":1860,"density":6.697,"groupBlock":"metalloid","yearDiscovered":"Ancient"},
{"atomicNumber":52,"symbol":"Te","name":"Tellurium","atomicMass":"127.60(3)","cpkHexColor":"D47A00","electronicConfiguration":"[Kr] 4d10 5s2 5p4","electronegativity":2.1,"atomicRadius":135,"ionRadius":"221 (-2)","vanDelWaalsRadius":206,"ionizationEnergy":869,"electronAffinity":-190,"oxidationStates":"-2, 2, 4, 5, 6","standardState":"solid","bondingType":"metallic","meltingPoint":723,"boilingPoint":1261,"density":6.24,"groupBlock":"metalloid","yearDiscovered":1782},
{"atomicNumber":53,"symbol":"I","name":"Iodine","atomicMass":"126.90447(3)","cpkHexColor":940094,"electronicConfiguration":"[Kr] 4d10 5s2 5p5","electronegativity":2.66,"atomicRadius":133,"ionRadius":"220 (-1)","vanDelWaalsRadius":198,"ionizationEnergy":1008,"electronAffinity":-295,"oxidationStates":"-1, 1, 3, 5, 7","standardState":"solid","bondingType":"covalent network","meltingPoint":387,"boilingPoint":457,"density":4.94,"groupBlock":"halogen","yearDiscovered":1811},
{"atomicNumber":54,"symbol":"Xe","name":"Xenon","atomicMass":"131.293(6)","cpkHexColor":"429EB0","electronicConfiguration":"[Kr] 4d10 5s2 5p6","electronegativity":"","atomicRadius":130,"ionRadius":"48 (+8)","vanDelWaalsRadius":216,"ionizationEnergy":1170,"electronAffinity":0,"oxidationStates":"2, 4, 6, 8","standardState":"gas","bondingType":"atomic","meltingPoint":161,"boilingPoint":165,"density":0.0059,"groupBlock":"noble gas","yearDiscovered":1898},
{"atomicNumber":55,"symbol":"Cs","name":"Cesium","atomicMass":"132.9054519(2)","cpkHexColor":"57178F","electronicConfiguration":"[Xe] 6s1","electronegativity":0.79,"atomicRadius":225,"ionRadius":"167 (+1)","vanDelWaalsRadius":"","ionizationEnergy":376,"electronAffinity":-46,"oxidationStates":1,"standardState":"solid","bondingType":"metallic","meltingPoint":302,"boilingPoint":944,"density":1.879,"groupBlock":"alkali metal","yearDiscovered":1860},
{"atomicNumber":56,"symbol":"Ba","name":"Barium","atomicMass":"137.327(7)","cpkHexColor":"00C900","electronicConfiguration":"[Xe] 6s2","electronegativity":0.89,"atomicRadius":198,"ionRadius":"135 (+2)","vanDelWaalsRadius":"","ionizationEnergy":503,"electronAffinity":-14,"oxidationStates":2,"standardState":"solid","bondingType":"metallic","meltingPoint":1000,"boilingPoint":2143,"density":3.51,"groupBlock":"alkaline earth metal","yearDiscovered":1808},
{"atomicNumber":57,"symbol":"La","name":"Lanthanum","atomicMass":"138.90547(7)","cpkHexColor":"70D4FF","electronicConfiguration":"[Xe] 5d1 6s2","electronegativity":1.1,"atomicRadius":169,"ionRadius":"103.2 (+3)","vanDelWaalsRadius":"","ionizationEnergy":538,"electronAffinity":-48,"oxidationStates":"2, 3","standardState":"solid","bondingType":"metallic","meltingPoint":1193,"boilingPoint":3737,"density":6.146,"groupBlock":"lanthanoid","yearDiscovered":1839},
{"atomicNumber":58,"symbol":"Ce","name":"Cerium","atomicMass":"140.116(1)","cpkHexColor":"FFFFC7","electronicConfiguration":"[Xe] 4f1 5d1 6s2","electronegativity":1.12,"atomicRadius":"","ionRadius":"102 (+3)","vanDelWaalsRadius":"","ionizationEnergy":534,"electronAffinity":-50,"oxidationStates":"2, 3, 4","standardState":"solid","bondingType":"metallic","meltingPoint":1071,"boilingPoint":3633,"density":6.689,"groupBlock":"lanthanoid","yearDiscovered":1803},
{"atomicNumber":59,"symbol":"Pr","name":"Praseodymium","atomicMass":"140.90765(2)","cpkHexColor":"D9FFC7","electronicConfiguration":"[Xe] 4f3 6s2","electronegativity":1.13,"atomicRadius":"","ionRadius":"99 (+3)","vanDelWaalsRadius":"","ionizationEnergy":527,"electronAffinity":-50,"oxidationStates":"2, 3, 4","standardState":"solid","bondingType":"metallic","meltingPoint":1204,"boilingPoint":3563,"density":6.64,"groupBlock":"lanthanoid","yearDiscovered":1885},
{"atomicNumber":60,"symbol":"Nd","name":"Neodymium","atomicMass":"144.242(3)","cpkHexColor":"C7FFC7","electronicConfiguration":"[Xe] 4f4 6s2","electronegativity":1.14,"atomicRadius":"","ionRadius":"129 (+2)","vanDelWaalsRadius":"","ionizationEnergy":533,"electronAffinity":-50,"oxidationStates":"2, 3","standardState":"solid","bondingType":"metallic","meltingPoint":1294,"boilingPoint":3373,"density":7.01,"groupBlock":"lanthanoid","yearDiscovered":1885},
{"atomicNumber":61,"symbol":"Pm","name":"Promethium","atomicMass":[145],"cpkHexColor":"A3FFC7","electronicConfiguration":"[Xe] 4f5 6s2","electronegativity":1.13,"atomicRadius":"","ionRadius":"97 (+3)","vanDelWaalsRadius":"","ionizationEnergy":540,"electronAffinity":-50,"oxidationStates":3,"standardState":"solid","bondingType":"metallic","meltingPoint":1373,"boilingPoint":3273,"density":7.264,"groupBlock":"lanthanoid","yearDiscovered":1947},
{"atomicNumber":62,"symbol":"Sm","name":"Samarium","atomicMass":"150.36(2)","cpkHexColor":"8FFFC7","electronicConfiguration":"[Xe] 4f6 6s2","electronegativity":1.17,"atomicRadius":"","ionRadius":"122 (+2)","vanDelWaalsRadius":"","ionizationEnergy":545,"electronAffinity":-50,"oxidationStates":"2, 3","standardState":"solid","bondingType":"metallic","meltingPoint":1345,"boilingPoint":2076,"density":7.353,"groupBlock":"lanthanoid","yearDiscovered":1853},
{"atomicNumber":63,"symbol":"Eu","name":"Europium","atomicMass":"151.964(1)","cpkHexColor":"61FFC7","electronicConfiguration":"[Xe] 4f7 6s2","electronegativity":1.2,"atomicRadius":"","ionRadius":"117 (+2)","vanDelWaalsRadius":"","ionizationEnergy":547,"electronAffinity":-50,"oxidationStates":"2, 3","standardState":"solid","bondingType":"metallic","meltingPoint":1095,"boilingPoint":1800,"density":5.244,"groupBlock":"lanthanoid","yearDiscovered":1901},
{"atomicNumber":64,"symbol":"Gd","name":"Gadolinium","atomicMass":"157.25(3)","cpkHexColor":"45FFC7","electronicConfiguration":"[Xe] 4f7 5d1 6s2","electronegativity":1.2,"atomicRadius":"","ionRadius":"93.8 (+3)","vanDelWaalsRadius":"","ionizationEnergy":593,"electronAffinity":-50,"oxidationStates":"1, 2, 3","standardState":"solid","bondingType":"metallic","meltingPoint":1586,"boilingPoint":3523,"density":7.901,"groupBlock":"lanthanoid","yearDiscovered":1880},
{"atomicNumber":65,"symbol":"Tb","name":"Terbium","atomicMass":"158.92535(2)","cpkHexColor":"30FFC7","electronicConfiguration":"[Xe] 4f9 6s2","electronegativity":1.2,"atomicRadius":"","ionRadius":"92.3 (+3)","vanDelWaalsRadius":"","ionizationEnergy":566,"electronAffinity":-50,"oxidationStates":"1, 3, 4","standardState":"solid","bondingType":"metallic","meltingPoint":1629,"boilingPoint":3503,"density":8.219,"groupBlock":"lanthanoid","yearDiscovered":1843},
{"atomicNumber":66,"symbol":"Dy","name":"Dysprosium","atomicMass":"162.500(1)","cpkHexColor":"1FFFC7","electronicConfiguration":"[Xe] 4f10 6s2","electronegativity":1.22,"atomicRadius":"","ionRadius":"107 (+2)","vanDelWaalsRadius":"","ionizationEnergy":573,"electronAffinity":-50,"oxidationStates":"2, 3","standardState":"solid","bondingType":"metallic","meltingPoint":1685,"boilingPoint":2840,"density":8.551,"groupBlock":"lanthanoid","yearDiscovered":1886},
{"atomicNumber":67,"symbol":"Ho","name":"Holmium","atomicMass":"164.93032(2)","cpkHexColor":"00FF9C","electronicConfiguration":"[Xe] 4f11 6s2","electronegativity":1.23,"atomicRadius":"","ionRadius":"90.1 (+3)","vanDelWaalsRadius":"","ionizationEnergy":581,"electronAffinity":-50,"oxidationStates":3,"standardState":"solid","bondingType":"metallic","meltingPoint":1747,"boilingPoint":2973,"density":8.795,"groupBlock":"lanthanoid","yearDiscovered":1878},
{"atomicNumber":68,"symbol":"Er","name":"Erbium","atomicMass":"167.259(3)","cpkHexColor":0,"electronicConfiguration":"[Xe] 4f12 6s2","electronegativity":1.24,"atomicRadius":"","ionRadius":"89 (+3)","vanDelWaalsRadius":"","ionizationEnergy":589,"electronAffinity":-50,"oxidationStates":3,"standardState":"solid","bondingType":"metallic","meltingPoint":1770,"boilingPoint":3141,"density":9.066,"groupBlock":"lanthanoid","yearDiscovered":1842},
{"atomicNumber":69,"symbol":"Tm","name":"Thulium","atomicMass":"168.93421(2)","cpkHexColor":"00D452","electronicConfiguration":"[Xe] 4f13 6s2","electronegativity":1.25,"atomicRadius":"","ionRadius":"103 (+2)","vanDelWaalsRadius":"","ionizationEnergy":597,"electronAffinity":-50,"oxidationStates":"2, 3","standardState":"solid","bondingType":"metallic","meltingPoint":1818,"boilingPoint":2223,"density":9.321,"groupBlock":"lanthanoid","yearDiscovered":1879},
{"atomicNumber":70,"symbol":"Yb","name":"Ytterbium","atomicMass":"173.054(5)","cpkHexColor":"00BF38","electronicConfiguration":"[Xe] 4f14 6s2","electronegativity":1.1,"atomicRadius":"","ionRadius":"102 (+2)","vanDelWaalsRadius":"","ionizationEnergy":603,"electronAffinity":-50,"oxidationStates":"2, 3","standardState":"solid","bondingType":"metallic","meltingPoint":1092,"boilingPoint":1469,"density":6.57,"groupBlock":"lanthanoid","yearDiscovered":1878},
{"atomicNumber":71,"symbol":"Lu","name":"Lutetium","atomicMass":"174.9668(1)","cpkHexColor":"00AB24","electronicConfiguration":"[Xe] 4f14 5d1 6s2","electronegativity":1.27,"atomicRadius":160,"ionRadius":"86.1 (+3)","vanDelWaalsRadius":"","ionizationEnergy":524,"electronAffinity":-50,"oxidationStates":3,"standardState":"solid","bondingType":"metallic","meltingPoint":1936,"boilingPoint":3675,"density":9.841,"groupBlock":"lanthanoid","yearDiscovered":1907},
{"atomicNumber":72,"symbol":"Hf","name":"Hafnium","atomicMass":"178.49(2)","cpkHexColor":"4DC2FF","electronicConfiguration":"[Xe] 4f14 5d2 6s2","electronegativity":1.3,"atomicRadius":150,"ionRadius":"71 (+4)","vanDelWaalsRadius":"","ionizationEnergy":659,"electronAffinity":0,"oxidationStates":"2, 3, 4","standardState":"solid","bondingType":"metallic","meltingPoint":2506,"boilingPoint":4876,"density":13.31,"groupBlock":"transition metal","yearDiscovered":1923},
{"atomicNumber":73,"symbol":"Ta","name":"Tantalum","atomicMass":"180.94788(2)","cpkHexColor":"4DA6FF","electronicConfiguration":"[Xe] 4f14 5d3 6s2","electronegativity":1.5,"atomicRadius":138,"ionRadius":"72 (+3)","vanDelWaalsRadius":"","ionizationEnergy":761,"electronAffinity":-31,"oxidationStates":"-1, 2, 3, 4, 5","standardState":"solid","bondingType":"metallic","meltingPoint":3290,"boilingPoint":5731,"density":16.65,"groupBlock":"transition metal","yearDiscovered":1802},
{"atomicNumber":74,"symbol":"W","name":"Tungsten","atomicMass":"183.84(1)","cpkHexColor":"2194D6","electronicConfiguration":"[Xe] 4f14 5d4 6s2","electronegativity":2.36,"atomicRadius":146,"ionRadius":"66 (+4)","vanDelWaalsRadius":"","ionizationEnergy":770,"electronAffinity":-79,"oxidationStates":"-2, -1, 1, 2, 3, 4, 5, 6","standardState":"solid","bondingType":"metallic","meltingPoint":3695,"boilingPoint":5828,"density":19.25,"groupBlock":"transition metal","yearDiscovered":1783},
{"atomicNumber":75,"symbol":"Re","name":"Rhenium","atomicMass":"186.207(1)","cpkHexColor":"267DAB","electronicConfiguration":"[Xe] 4f14 5d5 6s2","electronegativity":1.9,"atomicRadius":159,"ionRadius":"63 (+4)","vanDelWaalsRadius":"","ionizationEnergy":760,"electronAffinity":-15,"oxidationStates":"-3, -1, 1, 2, 3, 4, 5, 6, 7","standardState":"solid","bondingType":"metallic","meltingPoint":3459,"boilingPoint":5869,"density":21.02,"groupBlock":"transition metal","yearDiscovered":1925},
{"atomicNumber":76,"symbol":"Os","name":"Osmium","atomicMass":"190.23(3)","cpkHexColor":266696,"electronicConfiguration":"[Xe] 4f14 5d6 6s2","electronegativity":2.2,"atomicRadius":128,"ionRadius":"63 (+4)","vanDelWaalsRadius":"","ionizationEnergy":840,"electronAffinity":-106,"oxidationStates":"-2, -1, 1, 2, 3, 4, 5, 6, 7, 8","standardState":"solid","bondingType":"metallic","meltingPoint":3306,"boilingPoint":5285,"density":22.61,"groupBlock":"transition metal","yearDiscovered":1803},
{"atomicNumber":77,"symbol":"Ir","name":"Iridium","atomicMass":"192.217(3)","cpkHexColor":175487,"electronicConfiguration":"[Xe] 4f14 5d7 6s2","electronegativity":2.2,"atomicRadius":137,"ionRadius":"68 (+3)","vanDelWaalsRadius":"","ionizationEnergy":880,"electronAffinity":-151,"oxidationStates":"-3, -1, 1, 2, 3, 4, 5, 6","standardState":"solid","bondingType":"metallic","meltingPoint":2739,"boilingPoint":4701,"density":22.65,"groupBlock":"transition metal","yearDiscovered":1803},
{"atomicNumber":78,"symbol":"Pt","name":"Platinum","atomicMass":"195.084(9)","cpkHexColor":"D0D0E0","electronicConfiguration":"[Xe] 4f14 5d9 6s1","electronegativity":2.28,"atomicRadius":128,"ionRadius":"86 (+2)","vanDelWaalsRadius":175,"ionizationEnergy":870,"electronAffinity":-205,"oxidationStates":"2, 4, 5, 6","standardState":"solid","bondingType":"metallic","meltingPoint":2041,"boilingPoint":4098,"density":21.09,"groupBlock":"transition metal","yearDiscovered":"Ancient"},
{"atomicNumber":79,"symbol":"Au","name":"Gold","atomicMass":"196.966569(4)","cpkHexColor":"FFD123","electronicConfiguration":"[Xe] 4f14 5d10 6s1","electronegativity":2.54,"atomicRadius":144,"ionRadius":"137 (+1)","vanDelWaalsRadius":166,"ionizationEnergy":890,"electronAffinity":-223,"oxidationStates":"-1, 1, 2, 3, 5","standardState":"solid","bondingType":"metallic","meltingPoint":1337,"boilingPoint":3129,"density":19.3,"groupBlock":"transition metal","yearDiscovered":"Ancient"},
{"atomicNumber":80,"symbol":"Hg","name":"Mercury","atomicMass":"200.59(2)","cpkHexColor":"B8B8D0","electronicConfiguration":"[Xe] 4f14 5d10 6s2","electronegativity":2,"atomicRadius":149,"ionRadius":"119 (+1)","vanDelWaalsRadius":155,"ionizationEnergy":1007,"electronAffinity":0,"oxidationStates":"1, 2, 4","standardState":"liquid","bondingType":"metallic","meltingPoint":234,"boilingPoint":630,"density":13.534,"groupBlock":"transition metal","yearDiscovered":"Ancient"},
{"atomicNumber":81,"symbol":"Tl","name":"Thallium","atomicMass":"204.3833(2)","cpkHexColor":"A6544D","electronicConfiguration":"[Xe] 4f14 5d10 6s2 6p1","electronegativity":2.04,"atomicRadius":148,"ionRadius":"150 (+1)","vanDelWaalsRadius":196,"ionizationEnergy":589,"electronAffinity":-19,"oxidationStates":"1, 3","standardState":"solid","bondingType":"metallic","meltingPoint":577,"boilingPoint":1746,"density":11.85,"groupBlock":"metal","yearDiscovered":1861},
{"atomicNumber":82,"symbol":"Pb","name":"Lead","atomicMass":"207.2(1)","cpkHexColor":575961,"electronicConfiguration":"[Xe] 4f14 5d10 6s2 6p2","electronegativity":2.33,"atomicRadius":147,"ionRadius":"119 (+2)","vanDelWaalsRadius":202,"ionizationEnergy":716,"electronAffinity":-35,"oxidationStates":"-4, 2, 4","standardState":"solid","bondingType":"metallic","meltingPoint":601,"boilingPoint":2022,"density":11.34,"groupBlock":"metal","yearDiscovered":"Ancient"},
{"atomicNumber":83,"symbol":"Bi","name":"Bismuth","atomicMass":"208.98040(1)","cpkHexColor":"9E4FB5","electronicConfiguration":"[Xe] 4f14 5d10 6s2 6p3","electronegativity":2.02,"atomicRadius":146,"ionRadius":"103 (+3)","vanDelWaalsRadius":"","ionizationEnergy":703,"electronAffinity":-91,"oxidationStates":"-3, 3, 5","standardState":"solid","bondingType":"metallic","meltingPoint":544,"boilingPoint":1837,"density":9.78,"groupBlock":"metal","yearDiscovered":"Ancient"},
{"atomicNumber":84,"symbol":"Po","name":"Polonium","atomicMass":[209],"cpkHexColor":"AB5C00","electronicConfiguration":"[Xe] 4f14 5d10 6s2 6p4","electronegativity":2,"atomicRadius":"","ionRadius":"94 (+4)","vanDelWaalsRadius":"","ionizationEnergy":812,"electronAffinity":-183,"oxidationStates":"-2, 2, 4, 6","standardState":"solid","bondingType":"metallic","meltingPoint":527,"boilingPoint":1235,"density":9.196,"groupBlock":"metalloid","yearDiscovered":1898},
{"atomicNumber":85,"symbol":"At","name":"Astatine","atomicMass":[210],"cpkHexColor":"754F45","electronicConfiguration":"[Xe] 4f14 5d10 6s2 6p5","electronegativity":2.2,"atomicRadius":"","ionRadius":"62 (+7)","vanDelWaalsRadius":"","ionizationEnergy":920,"electronAffinity":-270,"oxidationStates":"-1, 1, 3, 5","standardState":"solid","bondingType":"covalent network","meltingPoint":575,"boilingPoint":"","density":"","groupBlock":"halogen","yearDiscovered":1940},
{"atomicNumber":86,"symbol":"Rn","name":"Radon","atomicMass":[222],"cpkHexColor":428296,"electronicConfiguration":"[Xe] 4f14 5d10 6s2 6p6","electronegativity":"","atomicRadius":145,"ionRadius":"","vanDelWaalsRadius":"","ionizationEnergy":1037,"electronAffinity":"","oxidationStates":2,"standardState":"gas","bondingType":"atomic","meltingPoint":202,"boilingPoint":211,"density":0.00973,"groupBlock":"noble gas","yearDiscovered":1900},
{"atomicNumber":87,"symbol":"Fr","name":"Francium","atomicMass":[223],"cpkHexColor":420066,"electronicConfiguration":"[Rn] 7s1","electronegativity":0.7,"atomicRadius":"","ionRadius":"180 (+1)","vanDelWaalsRadius":"","ionizationEnergy":380,"electronAffinity":"","oxidationStates":1,"standardState":"solid","bondingType":"metallic","meltingPoint":"","boilingPoint":"","density":"","groupBlock":"alkali metal","yearDiscovered":1939},
{"atomicNumber":88,"symbol":"Ra","name":"Radium","atomicMass":[226],"cpkHexColor":"007D00","electronicConfiguration":"[Rn] 7s2","electronegativity":0.9,"atomicRadius":"","ionRadius":"148 (+2)","vanDelWaalsRadius":"","ionizationEnergy":509,"electronAffinity":"","oxidationStates":2,"standardState":"solid","bondingType":"metallic","meltingPoint":973,"boilingPoint":2010,"density":5,"groupBlock":"alkaline earth metal","yearDiscovered":1898},
{"atomicNumber":89,"symbol":"Ac","name":"Actinium","atomicMass":[227],"cpkHexColor":"70ABFA","electronicConfiguration":"[Rn] 6d1 7s2","electronegativity":1.1,"atomicRadius":"","ionRadius":"112 (+3)","vanDelWaalsRadius":"","ionizationEnergy":499,"electronAffinity":"","oxidationStates":3,"standardState":"solid","bondingType":"metallic","meltingPoint":1323,"boilingPoint":3473,"density":10.07,"groupBlock":"actinoid","yearDiscovered":1899},
{"atomicNumber":90,"symbol":"Th","name":"Thorium","atomicMass":"232.03806(2)","cpkHexColor":"00BAFF","electronicConfiguration":"[Rn] 6d2 7s2","electronegativity":1.3,"atomicRadius":"","ionRadius":"94 (+4)","vanDelWaalsRadius":"","ionizationEnergy":587,"electronAffinity":"","oxidationStates":"2, 3, 4","standardState":"solid","bondingType":"metallic","meltingPoint":2023,"boilingPoint":5093,"density":11.724,"groupBlock":"actinoid","yearDiscovered":1828},
{"atomicNumber":91,"symbol":"Pa","name":"Protactinium","atomicMass":"231.03588(2)","cpkHexColor":"00A1FF","electronicConfiguration":"[Rn] 5f2 6d1 7s2","electronegativity":1.5,"atomicRadius":"","ionRadius":"104 (+3)","vanDelWaalsRadius":"","ionizationEnergy":568,"electronAffinity":"","oxidationStates":"3, 4, 5","standardState":"solid","bondingType":"metallic","meltingPoint":1845,"boilingPoint":4273,"density":15.37,"groupBlock":"actinoid","yearDiscovered":1913},
{"atomicNumber":92,"symbol":"U","name":"Uranium","atomicMass":"238.02891(3)","cpkHexColor":"008FFF","electronicConfiguration":"[Rn] 5f3 6d1 7s2","electronegativity":1.38,"atomicRadius":"","ionRadius":"102.5 (+3)","vanDelWaalsRadius":186,"ionizationEnergy":598,"electronAffinity":"","oxidationStates":"3, 4, 5, 6","standardState":"solid","bondingType":"metallic","meltingPoint":1408,"boilingPoint":4200,"density":19.05,"groupBlock":"actinoid","yearDiscovered":1789},
{"atomicNumber":93,"symbol":"Np","name":"Neptunium","atomicMass":[237],"cpkHexColor":"0080FF","electronicConfiguration":"[Rn] 5f4 6d1 7s2","electronegativity":1.36,"atomicRadius":"","ionRadius":"110 (+2)","vanDelWaalsRadius":"","ionizationEnergy":605,"electronAffinity":"","oxidationStates":"3, 4, 5, 6, 7","standardState":"solid","bondingType":"metallic","meltingPoint":917,"boilingPoint":4273,"density":20.45,"groupBlock":"actinoid","yearDiscovered":1940},
{"atomicNumber":94,"symbol":"Pu","name":"Plutonium","atomicMass":[244],"cpkHexColor":"006BFF","electronicConfiguration":"[Rn] 5f6 7s2","electronegativity":1.28,"atomicRadius":"","ionRadius":"100 (+3)","vanDelWaalsRadius":"","ionizationEnergy":585,"electronAffinity":"","oxidationStates":"3, 4, 5, 6, 7","standardState":"solid","bondingType":"metallic","meltingPoint":913,"boilingPoint":3503,"density":19.816,"groupBlock":"actinoid","yearDiscovered":1940},
{"atomicNumber":95,"symbol":"Am","name":"Americium","atomicMass":[243],"cpkHexColor":"545CF2","electronicConfiguration":"[Rn] 5f7 7s2","electronegativity":1.3,"atomicRadius":"","ionRadius":"126 (+2)","vanDelWaalsRadius":"","ionizationEnergy":578,"electronAffinity":"","oxidationStates":"2, 3, 4, 5, 6","standardState":"solid","bondingType":"metallic","meltingPoint":1449,"boilingPoint":2284,"density":"","groupBlock":"actinoid","yearDiscovered":1944},
{"atomicNumber":96,"symbol":"Cm","name":"Curium","atomicMass":[247],"cpkHexColor":"785CE3","electronicConfiguration":"[Rn] 5f7 6d1 7s2","electronegativity":1.3,"atomicRadius":"","ionRadius":"97 (+3)","vanDelWaalsRadius":"","ionizationEnergy":581,"electronAffinity":"","oxidationStates":"3, 4","standardState":"solid","bondingType":"metallic","meltingPoint":1618,"boilingPoint":3383,"density":13.51,"groupBlock":"actinoid","yearDiscovered":1944},
{"atomicNumber":97,"symbol":"Bk","name":"Berkelium","atomicMass":[247],"cpkHexColor":"8A4FE3","electronicConfiguration":"[Rn] 5f9 7s2","electronegativity":1.3,"atomicRadius":"","ionRadius":"96 (+3)","vanDelWaalsRadius":"","ionizationEnergy":601,"electronAffinity":"","oxidationStates":"3, 4","standardState":"solid","bondingType":"metallic","meltingPoint":1323,"boilingPoint":"","density":14.78,"groupBlock":"actinoid","yearDiscovered":1949},
{"atomicNumber":98,"symbol":"Cf","name":"Californium","atomicMass":[251],"cpkHexColor":"A136D4","electronicConfiguration":"[Rn] 5f10 7s2","electronegativity":1.3,"atomicRadius":"","ionRadius":"95 (+3)","vanDelWaalsRadius":"","ionizationEnergy":608,"electronAffinity":"","oxidationStates":"2, 3, 4","standardState":"solid","bondingType":"metallic","meltingPoint":1173,"boilingPoint":"","density":15.1,"groupBlock":"actinoid","yearDiscovered":1950},
{"atomicNumber":99,"symbol":"Es","name":"Einsteinium","atomicMass":[252],"cpkHexColor":"B31FD4","electronicConfiguration":"[Rn] 5f11 7s2","electronegativity":1.3,"atomicRadius":"","ionRadius":"","vanDelWaalsRadius":"","ionizationEnergy":619,"electronAffinity":"","oxidationStates":"2, 3","standardState":"solid","bondingType":"","meltingPoint":1133,"boilingPoint":"","density":"","groupBlock":"actinoid","yearDiscovered":1952},
{"atomicNumber":100,"symbol":"Fm","name":"Fermium","atomicMass":[257],"cpkHexColor":"B31FBA","electronicConfiguration":"[Rn] 5f12 7s2","electronegativity":1.3,"atomicRadius":"","ionRadius":"","vanDelWaalsRadius":"","ionizationEnergy":627,"electronAffinity":"","oxidationStates":"2, 3","standardState":"","bondingType":"","meltingPoint":1800,"boilingPoint":"","density":"","groupBlock":"actinoid","yearDiscovered":1952},
{"atomicNumber":101,"symbol":"Md","name":"Mendelevium","atomicMass":[258],"cpkHexColor":"B30DA6","electronicConfiguration":"[Rn] 5f13 7s2","electronegativity":1.3,"atomicRadius":"","ionRadius":"","vanDelWaalsRadius":"","ionizationEnergy":635,"electronAffinity":"","oxidationStates":"2, 3","standardState":"","bondingType":"","meltingPoint":1100,"boilingPoint":"","density":"","groupBlock":"actinoid","yearDiscovered":1955},
{"atomicNumber":102,"symbol":"No","name":"Nobelium","atomicMass":[259],"cpkHexColor":"BD0D87","electronicConfiguration":"[Rn] 5f14 7s2","electronegativity":1.3,"atomicRadius":"","ionRadius":"","vanDelWaalsRadius":"","ionizationEnergy":642,"electronAffinity":"","oxidationStates":"2, 3","standardState":"","bondingType":"","meltingPoint":1100,"boilingPoint":"","density":"","groupBlock":"actinoid","yearDiscovered":1957},
{"atomicNumber":103,"symbol":"Lr","name":"Lawrencium","atomicMass":[262],"cpkHexColor":"C70066","electronicConfiguration":"[Rn] 5f14 7s2 7p1","electronegativity":1.3,"atomicRadius":"","ionRadius":"","vanDelWaalsRadius":"","ionizationEnergy":"","electronAffinity":"","oxidationStates":3,"standardState":"","bondingType":"","meltingPoint":1900,"boilingPoint":"","density":"","groupBlock":"transition metal","yearDiscovered":1961},
{"atomicNumber":104,"symbol":"Rf","name":"Rutherfordium","atomicMass":[267],"cpkHexColor":"CC0059","electronicConfiguration":"[Rn] 5f14 6d2 7s2","electronegativity":"","atomicRadius":"","ionRadius":"","vanDelWaalsRadius":"","ionizationEnergy":"","electronAffinity":"","oxidationStates":4,"standardState":"","bondingType":"","meltingPoint":"","boilingPoint":"","density":"","groupBlock":"transition metal","yearDiscovered":1969},
{"atomicNumber":105,"symbol":"Db","name":"Dubnium","atomicMass":[268],"cpkHexColor":"D1004F","electronicConfiguration":"[Rn] 5f14 6d3 7s2","electronegativity":"","atomicRadius":"","ionRadius":"","vanDelWaalsRadius":"","ionizationEnergy":"","electronAffinity":"","oxidationStates":"","standardState":"","bondingType":"","meltingPoint":"","boilingPoint":"","density":"","groupBlock":"transition metal","yearDiscovered":1967},
{"atomicNumber":106,"symbol":"Sg","name":"Seaborgium","atomicMass":[271],"cpkHexColor":"D90045","electronicConfiguration":"[Rn] 5f14 6d4 7s2","electronegativity":"","atomicRadius":"","ionRadius":"","vanDelWaalsRadius":"","ionizationEnergy":"","electronAffinity":"","oxidationStates":"","standardState":"","bondingType":"","meltingPoint":"","boilingPoint":"","density":"","groupBlock":"transition metal","yearDiscovered":1974},
{"atomicNumber":107,"symbol":"Bh","name":"Bohrium","atomicMass":[272],"cpkHexColor":"E00038","electronicConfiguration":"[Rn] 5f14 6d5 7s2","electronegativity":"","atomicRadius":"","ionRadius":"","vanDelWaalsRadius":"","ionizationEnergy":"","electronAffinity":"","oxidationStates":"","standardState":"","bondingType":"","meltingPoint":"","boilingPoint":"","density":"","groupBlock":"transition metal","yearDiscovered":1976},
{"atomicNumber":108,"symbol":"Hs","name":"Hassium","atomicMass":[270],"cpkHexColor":"E6002E","electronicConfiguration":"[Rn] 5f14 6d6 7s2","electronegativity":"","atomicRadius":"","ionRadius":"","vanDelWaalsRadius":"","ionizationEnergy":"","electronAffinity":"","oxidationStates":"","standardState":"","bondingType":"","meltingPoint":"","boilingPoint":"","density":"","groupBlock":"transition metal","yearDiscovered":1984},
{"atomicNumber":109,"symbol":"Mt","name":"Meitnerium","atomicMass":[276],"cpkHexColor":"EB0026","electronicConfiguration":"[Rn] 5f14 6d7 7s2","electronegativity":"","atomicRadius":"","ionRadius":"","vanDelWaalsRadius":"","ionizationEnergy":"","electronAffinity":"","oxidationStates":"","standardState":"","bondingType":"","meltingPoint":"","boilingPoint":"","density":"","groupBlock":"transition metal","yearDiscovered":1982},
{"atomicNumber":110,"symbol":"Ds","name":"Darmstadtium","atomicMass":[281],"cpkHexColor":"","electronicConfiguration":"[Rn] 5f14 6d9 7s1","electronegativity":"","atomicRadius":"","ionRadius":"","vanDelWaalsRadius":"","ionizationEnergy":"","electronAffinity":"","oxidationStates":"","standardState":"","bondingType":"","meltingPoint":"","boilingPoint":"","density":"","groupBlock":"transition metal","yearDiscovered":1994},
{"atomicNumber":111,"symbol":"Rg","name":"Roentgenium","atomicMass":[280],"cpkHexColor":"","electronicConfiguration":"[Rn] 5f14 6d10 7s1","electronegativity":"","atomicRadius":"","ionRadius":"","vanDelWaalsRadius":"","ionizationEnergy":"","electronAffinity":"","oxidationStates":"","standardState":"","bondingType":"","meltingPoint":"","boilingPoint":"","density":"","groupBlock":"transition metal","yearDiscovered":1994},
{"atomicNumber":112,"symbol":"Cn","name":"Copernicium","atomicMass":[285],"cpkHexColor":"","electronicConfiguration":"[Rn] 5f14 6d10 7s2","electronegativity":"","atomicRadius":"","ionRadius":"","vanDelWaalsRadius":"","ionizationEnergy":"","electronAffinity":"","oxidationStates":"","standardState":"","bondingType":"","meltingPoint":"","boilingPoint":"","density":"","groupBlock":"transition metal","yearDiscovered":1996},
{"atomicNumber":113,"symbol":"Nh","name":"Nihonium","atomicMass":[284],"cpkHexColor":"","electronicConfiguration":"[Rn] 5f14 6d10 7s2 7p1","electronegativity":"","atomicRadius":"","ionRadius":"","vanDelWaalsRadius":"","ionizationEnergy":"","electronAffinity":"","oxidationStates":"","standardState":"","bondingType":"","meltingPoint":"","boilingPoint":"","density":"","groupBlock":"post-transition metal","yearDiscovered":2003},
{"atomicNumber":114,"symbol":"Fl","name":"Flerovium","atomicMass":[289],"cpkHexColor":"","electronicConfiguration":"[Rn] 5f14 6d10 7s2 7p2","electronegativity":"","atomicRadius":"","ionRadius":"","vanDelWaalsRadius":"","ionizationEnergy":"","electronAffinity":"","oxidationStates":"","standardState":"","bondingType":"","meltingPoint":"","boilingPoint":"","density":"","groupBlock":"post-transition metal","yearDiscovered":1998},
{"atomicNumber":115,"symbol":"Mc","name":"Moscovium","atomicMass":[288],"cpkHexColor":"","electronicConfiguration":"[Rn] 5f14 6d10 7s2 7p3","electronegativity":"","atomicRadius":"","ionRadius":"","vanDelWaalsRadius":"","ionizationEnergy":"","electronAffinity":"","oxidationStates":"","standardState":"","bondingType":"","meltingPoint":"","boilingPoint":"","density":"","groupBlock":"post-transition metal","yearDiscovered":2003},
{"atomicNumber":116,"symbol":"Lv","name":"Livermorium","atomicMass":[293],"cpkHexColor":"","electronicConfiguration":"[Rn] 5f14 6d10 7s2 7p4","electronegativity":"","atomicRadius":"","ionRadius":"","vanDelWaalsRadius":"","ionizationEnergy":"","electronAffinity":"","oxidationStates":"","standardState":"","bondingType":"","meltingPoint":"","boilingPoint":"","density":"","groupBlock":"post-transition metal","yearDiscovered":2000},
{"atomicNumber":117,"symbol":"Ts","name":"Tennessine","atomicMass":[294],"cpkHexColor":"","electronicConfiguration":"[Rn] 5f14 6d10 7s2 7p5","electronegativity":"","atomicRadius":"","ionRadius":"","vanDelWaalsRadius":"","ionizationEnergy":"","electronAffinity":"","oxidationStates":"","standardState":"","bondingType":"","meltingPoint":"","boilingPoint":"","density":"","groupBlock":"post-transition metal","yearDiscovered":2010},
{"atomicNumber":118,"symbol":"Og","name":"Oganesson","atomicMass":[294],"cpkHexColor":"","electronicConfiguration":"[Rn] 5f14 6d10 7s2 7p6","electronegativity":"","atomicRadius":"","ionRadius":"","vanDelWaalsRadius":"","ionizationEnergy":"","electronAffinity":"","oxidationStates":"","standardState":"","bondingType":"","meltingPoint":"","boilingPoint":"","density":"","groupBlock":"noble gas","yearDiscovered":2002}
]
},{}],8:[function(require,module,exports){
(function (__dirname){

var path = require('path');
var data = require('./data');

module.exports.jsonFile = path.join(__dirname, 'data.json');
module.exports.csvFile = path.join(__dirname, 'data.csv');

module.exports.all = function() {
	return data;
}

module.exports.elements = data.reduce(function(obj, element) {
	obj[element.name] = element;
	return obj;
}, {});

module.exports.symbols = data.reduce(function(obj, element) {
	obj[element.symbol] = element;
	return obj;
}, {});

module.exports.numbers = data.reduce(function(obj, element) {
  obj[element.atomicNumber] = element;
  return obj;
}, {});


}).call(this,"/node_modules\\periodic-table")
},{"./data":7,"path":6}],9:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[3]);
