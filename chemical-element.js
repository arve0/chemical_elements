
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

