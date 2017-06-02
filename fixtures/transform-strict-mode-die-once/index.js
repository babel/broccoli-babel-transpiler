"use strict";

var fs = require('fs');
var path = require('path');
var pluginFunction = require('babel-plugin-transform-strict-mode');

module.exports = {
  name: 'transform-strict-mode',

  build(options) {
    if (fs.existsSync(options.ripFile)) {
      // already died once
      fs.unlinkSync(options.ripFile);
      return pluginFunction;
    }
    else {
      // haven't died yet
      fs.writeFileSync(options.ripFile, 'I lived a short but intense life');
      return function() {
        process.exit(1);
      };
    }
  }
};
