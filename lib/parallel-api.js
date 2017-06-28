'use strict';

var transpiler = require('babel-core');
var path = require('path');
var workerpool = require('workerpool');
var Promise = require('rsvp').Promise;
var debugGenerator = require('heimdalljs-logger');

var jobs = Number(process.env.JOBS) || require('os').cpus().length;

// create a worker pool using an external worker script
var pool = workerpool.pool(path.join(__dirname, 'worker.js'), { maxWorkers: jobs });

var loggerName = 'broccoli-persistent-filter:ParallelApi';
var _logger = debugGenerator(loggerName);


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
      return option._parallelAPI !== undefined &&
             typeof option._parallelAPI[0] === 'string' && // file to require
             typeof option._parallelAPI[1] === 'object';   // define callback function, or how to build
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

// convert the options to the format that babel expects
function deserializeOptions(options) {
  var newOptions = options;

  // transform callbacks
  Object.keys(options).forEach(function(key) {
    var option = options[key];
    var parallelApiInfo = option._parallelAPI;
    if (parallelApiInfo) {
      var fileToRequire = parallelApiInfo[0];
      var params = parallelApiInfo[1];
      if (typeof fileToRequire === 'string' && typeof params === 'object') {
        if (params.callback) {
          newOptions[key] = require(fileToRequire)[params.callback];
        }
        else if (params.build) {
          newOptions[key] = require(fileToRequire).build(params.build);
        }
        else {
          throw new Error(key + ": must specify either 'callback' or 'build' property to use the parallel API");
        }
      }
      else {
        throw new Error(key + ': wrong format for _parallelAPI');
      }
    }
  });

  // transform plugins
  if (options.plugins !== undefined) {
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

// replace callback functions with objects so they can be transferred to the worker processes
function serializeOptions(options) {
  var serializableOptions = {};
  Object.keys(options).forEach(function(key) {
    var option = options[key];
    serializableOptions[key] = (typeof option === 'function') ? { _parallelAPI: option._parallelAPI } : option;
  });
  return serializableOptions;
}

function transformString(string, options) {
  if (transformIsParallelizable(options)) {
    _logger.debug('transformString is parallelizable');
    return pool.exec('transform', [string, serializeOptions(options)]);
  }
  else {
    _logger.debug('transformString is NOT parallelizable');
    return new Promise(function(resolve) {
      resolve(transpiler.transform(string, deserializeOptions(options)));
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
  deserializeOptions: deserializeOptions,
  serializeOptions: serializeOptions,
  transformString: transformString,
};
