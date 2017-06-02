"use strict";

module.exports = {
  name: 'amd-name-resolver',

  build(options) {
    return require('amd-name-resolver').moduleResolve;
  }
};
