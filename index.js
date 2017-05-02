const periodicTable = require('periodic-table');
const electronsPerShell = require('./electrons-per-shell.js');

const input = document.getElementsByTagName("input")[0];
const output = document.getElementById("output");
input.onkeyup = onKeyUp;

onKeyUp();

function onKeyUp (event) {
  let symbol = capitalize(input.value);
  if (symbol in periodicTable.symbols) {
    let el = ChemicalElement(periodicTable.symbols[symbol]);
    output.innerHTML = el;
  }
}

function capitalize (str) {
  return str[0].toUpperCase() + str.slice(1).toLowerCase();
}

function ChemicalElement (props) {
  let mass = Array.isArray(props.atomicMass) ?
    props.atomicMass[0] : parseInt(props.atomicMass);

  return `
    <div class=chemicalElement>
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
