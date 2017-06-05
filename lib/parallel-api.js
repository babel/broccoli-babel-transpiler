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
  pluginCanBeParallelized: function(plugin) {
    return typeof plugin === 'string' ||
           (Object.prototype.toString.call(plugin) === '[object Array]' &&
            plugin.length === 3 &&
            typeof (plugin[0]) === 'string' &&
            typeof (plugin[1]) === 'string');
  },

  pluginsAreParallelizable: function(plugins) {
    return plugins === undefined || plugins.every(this.pluginCanBeParallelized);
  },

  resolveModuleIsParallelizable: function(resolveModule) {
    return resolveModule === undefined ||
           (Object.prototype.toString.call(resolveModule) === '[object Array]' &&
            resolveModule.length === 3 &&
            typeof (resolveModule[0]) === 'string' &&
            typeof (resolveModule[1]) === 'string');
  },

  transformIsParallelizable: function(options) {
    return this.pluginsAreParallelizable(options.plugins) &&
           this.resolveModuleIsParallelizable(options.resolveModuleSource);
  },

  // transpile the input string, using the input options
  transformOptions: function(options) {
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
          // plugin is a string or function, that's fine
          return plugin;
        }
      });
    }

    return newOptions;
  },

  transformString: function(string, options) {
    if (this.transformIsParallelizable(options)) {
      // send the job to the worker pool
      return pool.exec('transform', [string, options]).catch(function (err) {
        if (typeof err === 'object' && err !== null &&
            (err.message === 'Worker terminated unexpectedly' || err.message === 'Worker is terminated')) {
          // retry one time if it's a worker error
          return pool.exec('transform', [string, options]);
        }
        else {
          throw err;
        }
      });
    }
    else {
      return Promise.resolve(transpiler.transform(string, this.transformOptions(options)));
    }
  },
};
