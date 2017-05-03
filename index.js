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

function dom2blob (DOMElement, filename) {
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
