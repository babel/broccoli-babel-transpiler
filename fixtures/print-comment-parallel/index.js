"use strict";

module.exports = {
  build(options) {
    return (comment) => comment === options.contents;
  }
};
