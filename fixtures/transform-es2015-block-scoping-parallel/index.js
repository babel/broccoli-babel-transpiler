"use strict";

module.exports = {
  name: 'transform-es2015-block-scoping',

  pluginFunction: require('babel-plugin-transform-es2015-block-scoping'),

  build() {
    return 'transform-es2015-block-scoping';
  },

  buildTwo(options) {
    return 'for-testing' + options.text;
  }
};
