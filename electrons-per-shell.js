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