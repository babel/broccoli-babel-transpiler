"use strict";

module.exports = {
  buildMe(options) {
    return (comment) => comment === options.contents;
  }
};
