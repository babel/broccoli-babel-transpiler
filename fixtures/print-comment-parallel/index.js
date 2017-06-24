"use strict";

module.exports = {
  build: function(options) {
    return function(comment) { return comment === options.contents; };
  }
};
