"use strict";

module.exports = {
  build: function(options) {
    return function(moduleName) { return options.name; };
  }
};
