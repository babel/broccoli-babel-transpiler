'use strict';

var transpiler = require('babel-core');
var workerpool = require('workerpool');
var Promise = require('rsvp').Promise;


// transpile the input string, using the input options
function transform(string, options) {

  if (options.resolveModuleSource !== undefined) {
    // convert to work with Babel, if needed
    if (Object.prototype.toString.call(options.resolveModuleSource) === '[object Array]') {
      options.resolveModuleSource = require(options.resolveModuleSource[1]).build(options.resolveModuleSource[2]);
    }
  }

  if (options.plugins !== undefined) {
    // convert plugins to work with Babel, if needed
    options.plugins = options.plugins.map(function(plugin) {
      if (Object.prototype.toString.call(plugin) === '[object Array]') {
        return require(plugin[1]).build(plugin[2]);
      }
      else {
        // plugin is a string, that's fine
        return plugin;
      }
    });
  }

  return new Promise(function(resolve) {
    var result = transpiler.transform(string, options);
    // this is large, not used, and can't be serialized anyway
    delete result.ast;

    resolve(result);
  });
}

// create worker and register public functions
workerpool.worker({
  transform: transform
});
