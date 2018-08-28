"use strict";

const path = require('path');
const { moduleResolve } = require('amd-name-resolver');

module.exports = {
  name: 'amd-name-resolver',
  moduleResolve(name, child) {
    return path.relative(process.cwd(), moduleResolve(name, child));
  }
};
