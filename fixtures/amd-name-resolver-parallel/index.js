"use strict";

module.exports = {
  name: 'amd-name-resolver',

  build: function(options) {
    return require('amd-name-resolver').moduleResolve;
  }
};
