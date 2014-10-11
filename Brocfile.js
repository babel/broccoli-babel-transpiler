'use strict';
var transpiler = require('./index');

module.exports = transpiler('fixtures', {
  sourceMap: 'inline'
});
