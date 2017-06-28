"use strict";

module.exports = {
  buildMe: function(options) {
    return function(comment) { return comment === options.contents; };
  }
};
