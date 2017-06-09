"use strict";

module.exports = {
  name: 'i-always-exit',

  build(options) {
    return function() {
      process.exit(1);
    };
  }
};
