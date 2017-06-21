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

  callbacksAreParallelizable(options) {
    return Object.keys(options).every(function(key) {
      let option = options[key];
      if (typeof option === 'function') {
        return option.parallelAPI !== undefined &&
               typeof option.parallelAPI[0] === 'string' && // file to require
               typeof option.parallelAPI[1] === 'object';   // options to pass to build()
      }
      else {
        return true;
      }
    });
  },

  transformIsParallelizable(options) {
    return this.pluginsAreParallelizable(options.plugins) &&
           this.callbacksAreParallelizable(options);
  },

  // transpile the input string, using the input options
  transformOptions(options) {
    var newOptions = options;

    // transform callbacks
    Object.keys(options).forEach((key) => {
      const option = options[key];
      let parallelApiInfo = option.parallelAPI;
      if (parallelApiInfo) {
        if (typeof parallelApiInfo[0] === 'string' && typeof parallelApiInfo[1] === 'object') {
          newOptions[key] = require(parallelApiInfo[0]).build(parallelApiInfo[1]);
        }
        else {
          throw new Error(key + ': wrong format for parallelAPI');
        }
      }
    });

    // transform plugins
    if (options.plugins !== undefined) {
      var self = this;
      // convert plugins to work with Babel, if needed
      newOptions.plugins = options.plugins.map((plugin) => {
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

  // TODO
  makeSerializable(options) {
    // needed for any callback functions using the parallel API
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
