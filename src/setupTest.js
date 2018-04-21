const seedrandom = require('seedrandom');

module.exports = async function setup() {
  // seed Math.random so that we have a deterministic behavior in our test
  // coverage
  seedrandom('hello', { global: true });
}
