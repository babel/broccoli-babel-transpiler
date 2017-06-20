'use strict';

var transpiler = require('babel-core');
var path = require('path');
var workerpool = require('workerpool');
var Promise = require('rsvp').Promise;

var jobs = Number(process.env.JOBS) || require('os').cpus().length;

// create a worker pool using an external worker script
var pool = workerpool.pool(path.join(__dirname, 'worker.js'), { maxWorkers: jobs });


module.exports = {
  jobs,

  pluginUsesParallelAPI(plugin) {
    return (Array.isArray(plugin) && plugin.length === 3 &&
            typeof (plugin[0]) === 'string' && typeof (plugin[1]) === 'string' && typeof (plugin[2]) === 'object');

  },

  pluginCanBeParallelized(plugin) {
    return typeof plugin === 'string' || this.pluginUsesParallelAPI(plugin);
  },

  pluginsAreParallelizable(plugins) {
    return plugins === undefined || plugins.every(this.pluginCanBeParallelized.bind(this));
  },

  resolveModuleIsParallelizable(resolveModule) {
    return resolveModule === undefined ||
           resolveModule.parallelAPI !== undefined &&
           typeof resolveModule.parallelAPI[0] === 'string' && // file to require
           typeof resolveModule.parallelAPI[1] === 'object';   // options to pass to build()
  },

  transformIsParallelizable(options) {
    return this.pluginsAreParallelizable(options.plugins) &&
           this.resolveModuleIsParallelizable(options.resolveModuleSource);
  },

  // transpile the input string, using the input options
  transformOptions(options) {
    var newOptions = options;

    var resolveParallel = (options.resolveModuleSource !== undefined) && options.resolveModuleSource.parallelAPI;
    if (resolveParallel) {
      newOptions.resolveModuleSource = require(resolveParallel[0]).build(resolveParallel[1]);
    }

    if (options.plugins !== undefined) {
      var self = this;
      // convert plugins to work with Babel, if needed
      newOptions.plugins = options.plugins.map(function(plugin) {
        if (self.pluginUsesParallelAPI(plugin)) {
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

  makeSerializable(options) {
    // only option that needs this currently is resolveModuleSource
    const serializableOptions = options;
    if (options.resolveModuleSource !== undefined) {
      serializableOptions.resolveModuleSource = { parallelAPI: options.resolveModuleSource.parallelAPI };
    }
    // TODO other callbacks that can be passed to babel
    return serializableOptions;
  },

  transformString(string, options) {
    if (this.transformIsParallelizable(options)) {
      const serializableOptions = this.makeSerializable(options);
      return pool.exec('transform', [string, serializableOptions]);
    }
    else {
      return new Promise((resolve) => {
        resolve(transpiler.transform(string, this.transformOptions(options)));
      });
    }
  },
};
