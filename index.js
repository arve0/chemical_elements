const periodicTable = require('periodic-table');
const electronsPerShell = require('./electrons-per-shell.js');

const inputs = {
  chemicalSymbol: document.getElementById('chemical-symbol'),
  atomicNumber: document.getElementById('atomic-number'),
  nucleons: document.getElementById('nucleons'),
  electronConfiguration: document.getElementById('electron-configuration')
};

const output = document.getElementById('output');
inputs.chemicalSymbol.onkeyup = onSymbolKeyUp;
inputs.atomicNumber.onkeyup = onAtomicNumberKeyUp;
inputs.atomicNumber.onclick = onAtomicNumberKeyUp;

onSymbolKeyUp();

function onSymbolKeyUp (event) {
  let symbol = capitalize(inputs.chemicalSymbol.value);
  let element = getElement({ type: 'symbol', value: symbol });
  output.innerHTML = ChemicalElement(element);
}

function onAtomicNumberKeyUp (event) {
  let atomicNumber = capitalize(inputs.atomicNumber.value);
  let element = getElement({ type: 'atomicNumber', value: atomicNumber });
  output.innerHTML = ChemicalElement(element);
}

function getElement (by) {
  let lookup = (by.type === 'symbol') ? 'symbols' : 'numbers';

  return (periodicTable[lookup] && by.value in periodicTable[lookup]) ?
    periodicTable[lookup][by.value] :
    Object.assign({}, periodicTable.symbols.H, { [by.type]: by.value });
}

function capitalize (str) {
  return str[0].toUpperCase() + str.slice(1).toLowerCase();
}

function ChemicalElement (props) {
  let mass = Array.isArray(props.atomicMass) ?
    props.atomicMass[0] : parseInt(props.atomicMass);

  return `
    <div class=chemical-element>
      <div class=left>
        <span class=atomicMass>${mass}</span>
        <span class=symbol>${props.symbol}</span>
        <span class=atomicNumber>${props.atomicNumber}</span>
      </div>
      <div class=right>
        ${electronsPerShell(props).map(Span).join('')}
      </div>
    </div>`;
}

function Span (inner) {
  return `<span>${inner}</span>`
}
