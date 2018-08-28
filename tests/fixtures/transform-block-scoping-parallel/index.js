"use strict";

module.exports = {
  name: 'transform-block-scoping',

  pluginFunction: require('@babel/plugin-transform-block-scoping'),

  build() {
    return '@babel/transform-block-scoping';
  },

  buildTwo(options) {
    return 'for-testing' + options.text;
  }
};
