'use strict';

var transpiler = require('babel-core');
var path = require('path');
var workerpool = require('workerpool');
var Promise = require('rsvp').Promise;

var jobs = Number(process.env.JOBS) || require('os').cpus().length;

// create a worker pool using an external worker script
var pool = workerpool.pool(path.join(__dirname, 'worker.js'), { maxWorkers: jobs });


module.exports = {
  jobs: jobs,

  pluginUsesParallelAPI: function(plugin) {
    return (Array.isArray(plugin) && plugin.length === 3 &&
            typeof (plugin[0]) === 'string' && typeof (plugin[1]) === 'string' && typeof (plugin[2]) === 'object');

  },

  pluginCanBeParallelized: function(plugin) {
    return typeof plugin === 'string' || this.pluginUsesParallelAPI(plugin);
  },

  pluginsAreParallelizable: function(plugins) {
    return plugins === undefined || plugins.every(this.pluginCanBeParallelized.bind(this));
  },

  callbacksAreParallelizable: function(options) {
    return Object.keys(options).every(function(key) {
      var option = options[key];
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

  transformIsParallelizable: function(options) {
    return this.pluginsAreParallelizable(options.plugins) &&
           this.callbacksAreParallelizable(options);
  },

  // transpile the input string, using the input options
  transformOptions: function(options) {
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

  // TODO
  makeSerializable: function(options) {
    // needed for any callback functions using the parallel API
    var serializableOptions = options;
    if (options.resolveModuleSource !== undefined) {
      serializableOptions.resolveModuleSource = { parallelAPI: options.resolveModuleSource.parallelAPI };
    }
    // TODO other callbacks that can be passed to babel
    return serializableOptions;
  },

  transformString: function(string, options) {
    if (this.transformIsParallelizable(options)) {
      var serializableOptions = this.makeSerializable(options);
      return pool.exec('transform', [string, serializableOptions]);
    }
    else {
      var self = this;
      return new Promise(function(resolve) {
        resolve(transpiler.transform(string, self.transformOptions(options)));
      });
    }
  },
};
