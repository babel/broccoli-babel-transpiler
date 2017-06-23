'use strict';

var transpiler = require('babel-core');
var path = require('path');
var workerpool = require('workerpool');
var Promise = require('rsvp').Promise;

var jobs = Number(process.env.JOBS) || require('os').cpus().length;

// create a worker pool using an external worker script
var pool = workerpool.pool(path.join(__dirname, 'worker.js'), { maxWorkers: jobs });


function pluginUsesParallelAPI(plugin) {
  return (Array.isArray(plugin) && plugin.length === 3 &&
         typeof (plugin[0]) === 'string' && typeof (plugin[1]) === 'string' && typeof (plugin[2]) === 'object');
}

function pluginCanBeParallelized(plugin) {
  return typeof plugin === 'string' || pluginUsesParallelAPI(plugin);
}

function pluginsAreParallelizable(plugins) {
  return plugins === undefined || plugins.every(pluginCanBeParallelized);
}

function callbacksAreParallelizable(options) {
  return Object.keys(options).every(function(key) {
    var option = options[key];
    if (typeof option === 'function') {
      // TODO refactor this to something else
      return option.parallelAPI !== undefined &&
             typeof option.parallelAPI[0] === 'string' && // file to require
             typeof option.parallelAPI[1] === 'object';   // options to pass to build()
    }
    else {
      return true;
    }
  });
}

function transformIsParallelizable(options) {
  return pluginsAreParallelizable(options.plugins) &&
         callbacksAreParallelizable(options);
}

// transpile the input string, using the input options
function transformOptions(options) {
  var newOptions = options;

  // transform callbacks
  Object.keys(options).forEach(function(key) {
    var option = options[key];
    var parallelApiInfo = option.parallelAPI;
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
    // convert plugins to work with Babel, if needed
    newOptions.plugins = options.plugins.map(function(plugin) {
      if (pluginUsesParallelAPI(plugin)) {
        return require(plugin[1]).build(plugin[2]);
      }
      else {
        // plugin is a string or function, that's fine
        return plugin;
      }
    });
  }

  return newOptions;
}

// TODO
function makeSerializable(options) {
  // needed for any callback functions using the parallel API
  var serializableOptions = options;
  if (options.resolveModuleSource !== undefined) {
    serializableOptions.resolveModuleSource = { parallelAPI: options.resolveModuleSource.parallelAPI };
  }
  // TODO other callbacks that can be passed to babel
  return serializableOptions;
}

function transformString(string, options) {
  if (transformIsParallelizable(options)) {
    var serializableOptions = makeSerializable(options);
    return pool.exec('transform', [string, serializableOptions]);
  }
  else {
    return new Promise(function(resolve) {
      resolve(transpiler.transform(string, transformOptions(options)));
    });
  }
}

module.exports = {
  jobs: jobs,
  pluginUsesParallelAPI: pluginUsesParallelAPI,
  pluginCanBeParallelized: pluginCanBeParallelized,
  pluginsAreParallelizable: pluginsAreParallelizable,
  callbacksAreParallelizable: callbacksAreParallelizable,
  transformIsParallelizable: transformIsParallelizable,
  transformOptions: transformOptions,
  makeSerializable: makeSerializable,
  transformString: transformString,
};
