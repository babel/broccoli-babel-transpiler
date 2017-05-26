/* globals console, require */
// TODO (take those out later)
'use strict'; // jshint ignore:line

var transpiler = require('babel-core');
var workerpool = require('workerpool');

var moduleResolve = require('amd-name-resolver').moduleResolve;

var Promise = require('rsvp').Promise;


// transpile the input string, using the input options
function transform(string, options) {

  if (options.resolveModuleSource_amd !== undefined) {
    // converting this is easy for now
    // TODO - change this API to something similar to the plugins
    options.resolveModuleSource = moduleResolve;
    delete options.resolveModuleSource_amd;
  }

  if (options.plugins !== undefined) {
    // convert plugins to work with Babel
    options.plugins = options.plugins.map(function(plugin) {
      if (Object.prototype.toString.call(plugin) === '[object Array]') {
        var name = plugin[0]; // name - not used at the moment
        var requireFile = plugin[1];
        var options = plugin[2];

        var something = require(requireFile);
        var newPlugin = something.buildPlugin(options);
        return newPlugin;
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
  })
  // .catch(Promise.reject); // TODO - use this after debugging
  .catch(function(err) {
    console.log('[REMOTE] [ERROR]');
    console.log(err);
    return Promise.reject(err); // TODO - should I throw in the main process?
  });

}

// create a worker and register public functions
workerpool.worker({
  transform: transform
});
