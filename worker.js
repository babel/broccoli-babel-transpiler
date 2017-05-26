'use strict';

var transpiler = require('babel-core');
var workerpool = require('workerpool');
var Promise = require('rsvp').Promise;

// TODO - remove
var moduleResolve = require('amd-name-resolver').moduleResolve;



// transpile the input string, using the input options
function transform(string, options) {

  if (options.resolveModuleSource_amd !== undefined) {
    // converting this is easy for now
    // TODO - change this API to be like the plugins
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

        return require(requireFile).buildPlugin(options);
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
  .catch(Promise.reject); // TODO - not sure if this is needed
}

// create worker and register public functions
workerpool.worker({
  transform: transform
});
