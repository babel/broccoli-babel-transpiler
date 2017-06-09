"use strict";

module.exports = {
  name: 'i-always-exit',

  build: function(options) {
    return function() {
      process.exit(1);
    };
  }
};
