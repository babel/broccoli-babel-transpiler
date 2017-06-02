"use strict";

var pluginFunction = require('babel-plugin-transform-strict-mode');

module.exports = {
  name: 'transform-strict-mode',

  build(options) {
    return function() {
      process.exit(1);
    };
  }
};
