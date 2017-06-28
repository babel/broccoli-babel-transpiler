"use strict";

module.exports = {
  name: 'i-always-exit',

  buildMeAFunction: function() {
    return function() {
      process.exit(1);
    };
  },

  exampleFunction: require('babel-plugin-example'),

  build: function() {
    return 'build ok';
  },

  buildTwo: function(options) {
    return 'for-testing' + options.text;
  }
};
