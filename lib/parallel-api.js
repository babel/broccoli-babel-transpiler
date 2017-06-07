'use strict';

var transpiler = require('babel-core');
var path = require('path');
var os = require('os');
var workerpool = require('workerpool');
var Promise = require('rsvp').Promise;

// create a worker pool using an external worker script
// TODO - benchmark to find optimal number of workers/core
var pool = workerpool.pool(path.join(__dirname, 'worker.js'), { maxWorkers: os.cpus().length });


module.exports = {
  pluginCanBeParallelized(plugin) {
    return typeof plugin === 'string' ||
           (Array.isArray(plugin) &&
            plugin.length === 3 &&
            typeof (plugin[0]) === 'string' &&
            typeof (plugin[1]) === 'string');
  },

  pluginsAreParallelizable(plugins) {
    return plugins === undefined || plugins.every(this.pluginCanBeParallelized);
  },

  resolveModuleIsParallelizable(resolveModule) {
    return resolveModule === undefined ||
           (Array.isArray(resolveModule) &&
            resolveModule.length === 3 &&
            typeof (resolveModule[0]) === 'string' &&
            typeof (resolveModule[1]) === 'string');
  },

  transformIsParallelizable(options) {
    return this.pluginsAreParallelizable(options.plugins) &&
           this.resolveModuleIsParallelizable(options.resolveModuleSource);
  },

  // transpile the input string, using the input options
  transformOptions(options) {
    var newOptions = options;

    if (options.resolveModuleSource !== undefined && Array.isArray(options.resolveModuleSource)) {
      newOptions.resolveModuleSource = require(options.resolveModuleSource[1]).build(options.resolveModuleSource[2]);
    }

    if (options.plugins !== undefined) {
      // convert plugins to work with Babel, if needed
      newOptions.plugins = options.plugins.map(function(plugin) {
        if (Array.isArray(plugin)) {
          return require(plugin[1]).build(plugin[2]);
        }
        else {
          // plugin is a string or function, that's fine
          return plugin;
        }
      });
    }

    return newOptions;
  },

  transformString(string, options) {
    if (this.transformIsParallelizable(options)) {
      return pool.exec('transform', [string, options]);
    }
    else {
      return new Promise((resolve) => {
        resolve(transpiler.transform(string, this.transformOptions(options)));
      });
    }
  },
};
