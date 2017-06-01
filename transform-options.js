'use strict';

// transpile the input string, using the input options
function transformOptions(options) {

  var newOptions = options;

  if (options.resolveModuleSource !== undefined) {
    // convert to work with Babel, if needed
    if (Object.prototype.toString.call(options.resolveModuleSource) === '[object Array]') {
      newOptions.resolveModuleSource = require(options.resolveModuleSource[1]).build(options.resolveModuleSource[2]);
    }
  }

  if (options.plugins !== undefined) {
    // convert plugins to work with Babel, if needed
    newOptions.plugins = options.plugins.map(function(plugin) {
      if (Object.prototype.toString.call(plugin) === '[object Array]') {
        return require(plugin[1]).build(plugin[2]);
      }
      else {
        // plugin is a string, that's fine
        return plugin;
      }
    });
  }

  return newOptions;
}

module.exports = transformOptions;
