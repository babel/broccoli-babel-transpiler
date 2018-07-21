'use strict';

const transpiler = require('babel-core');
const path = require('path');
const workerpool = require('workerpool');
const Promise = require('rsvp').Promise;
const debugGenerator = require('heimdalljs-logger');

const JOBS = Number(process.env.JOBS) || require('os').cpus().length;

const loggerName = 'broccoli-persistent-filter:babel:parallel-api';
const _logger = debugGenerator(loggerName);

const babelCoreVersion = getBabelVersion();

// return the version of Babel that will be used by this plugin
function getBabelVersion() {
  return require('babel-core/package.json').version;
}

function getWorkerPool() {
  let pool;
  let globalPoolID = 'v1/broccoli-babel-transpiler/workerpool/babel-core-' + babelCoreVersion;
  let existingPool = process[globalPoolID];

  if (existingPool) {
    pool = existingPool;
  } else {
    pool = workerpool.pool(path.join(__dirname, 'worker.js'), { maxWorkers: JOBS });
    process[globalPoolID] = pool;
  }
  return pool;
}

function implementsParallelAPI(object) {
  return typeof object._parallelBabel === 'object' &&
         typeof object._parallelBabel.requireFile === 'string';
}

function valueIsSerializable(value) {
  if (Array.isArray(value)) {
    return value.every(valueIsSerializable);
  } else if (value === null) {
     return true;
  } else {
    switch (typeof value) {
      case 'string':
      case 'number':
      case 'boolean': return true;
      case 'object':  return Object.keys(value).every(key => valueIsSerializable(value[key]));
      default:        return false;
    }
  }
}

function functionIsSerializable(fn) {
  if (typeof fn !== 'function') {
    return false;
  } else if (typeof fn._parallelBabel === 'object' && fn._parallelBabel !== null) {
    return typeof fn._parallelBabel.requireFile === 'string';
  } else {
    return true;
  }
}

function pluginIsSerializableArray(array) {
  if (Array.isArray(array) === false) { return false; }
  if (array.length === 0 ) { return true; }

  let plugin = array[0];
  let args = array.slice(1);
  let pluginIsSerializeable = false;
  let type = typeof plugin;

  return (typeof plugin === 'string' || plugin === null || functionIsSerializable(plugin)) && args.every(valueIsSerializable);
}

function pluginCanBeParallelized(plugin) {
  if (typeof plugin === 'string') { return true; }
  if (Array.isArray(plugin))      { return pluginIsSerializableArray(plugin); }

  return implementsParallelAPI(plugin);
}

function pluginsAreParallelizable(plugins) {
  const errors = [];
  let isParallelizable = true;

  if (Array.isArray(plugins)) {
    for (let i = 0; i < plugins.length; i++) {
      let plugin = plugins[i];
      if (pluginCanBeParallelized(plugin) === false) {
        isParallelizable = false;
        errors.push(humanizePlugin(plugin));
      }
    }
  }

  return {
    isParallelizable,
    errors
  };
}

function callbacksAreParallelizable(options) {
  const callbacks = Object.keys(options).filter(key => typeof options[key] === 'function');
  let isParallelizable = true;
  const errors = [];

  for (let i = 0; i < callbacks.length; i++) {
    let callback = options[callbacks[i]];
    if (implementsParallelAPI(callback) === false) {
      isParallelizable = false;
      errors.push(humanizePlugin(callback))
    }
  }

  return { isParallelizable, errors };
}

function transformIsParallelizable(options) {
  const plugins = pluginsAreParallelizable(options.plugins);
  const callbacks = callbacksAreParallelizable(options);

  return {
    isParallelizable: plugins.isParallelizable && callbacks.isParallelizable,
    errors: [].concat(plugins.errors, callbacks.errors)
  };
}

function humanizePlugin(plugin) {
  let name, baseDir;

  if (Array.isArray(plugin) && typeof plugin[0] === 'function') {
    plugin = plugin[0];
  }

  if (typeof plugin === 'function' || typeof plugin === 'object' && plugin !== null) {
    if (typeof plugin.name === 'string') {
      name = plugin.name;
    }
    if (typeof plugin.baseDir === 'function') {
      baseDir = plugin.baseDir();
    }
  }
  const output = `name: ${name || 'unknown'}, location: ${baseDir || 'unknown'}`;

  if (!name && typeof plugin === 'function') {
    return output + `,\n↓ function source ↓ \n${plugin.toString().substr(0, 200)}\n \n`;
  } else {
    return output;
  }
}

function buildFromParallelApiInfo(parallelApiInfo) {
  let requiredStuff = require(parallelApiInfo.requireFile);

  if (parallelApiInfo.useMethod) {
    if (requiredStuff[parallelApiInfo.useMethod] === undefined) {
      throw new Error("method '" + parallelApiInfo.useMethod + "' does not exist in file " + parallelApiInfo.requireFile);
    }
    return requiredStuff[parallelApiInfo.useMethod];
  }

  if (parallelApiInfo.buildUsing) {
    if (typeof requiredStuff[parallelApiInfo.buildUsing] !== 'function') {
      throw new Error("'" + parallelApiInfo.buildUsing + "' is not a function in file " + parallelApiInfo.requireFile);
    }
    return requiredStuff[parallelApiInfo.buildUsing](parallelApiInfo.params);
  }

  return requiredStuff;
}

// convert the options to the format that babel expects
function deserializeOptions(options) {
  let newOptions = options;

  // transform callbacks
  Object.keys(options).forEach(key => {
    let value = options[key];
    if (value === undefined) {
      return;
    }
    if (implementsParallelAPI(value)) {
      newOptions[key] = buildFromParallelApiInfo(value._parallelBabel);
    }
  });

  // transform plugins
  if (options.plugins !== undefined) {
    newOptions.plugins = options.plugins.map(plugin => {
      return implementsParallelAPI(plugin) ? buildFromParallelApiInfo(plugin._parallelBabel) : plugin;
    });
  }

  return newOptions;
}

// replace callback functions with objects so they can be transferred to the worker processes
function serializeOptions(options) {
  const serializableOptions = {};

  Object.keys(options).forEach(key => {
    let option = options[key];
    if (typeof option === 'function') {
      option = {
        _parallelBabel: option._parallelBabel
      };
    }

    serializableOptions[key] = option;
  });

  return serializableOptions;
}

function transformString(string, babelOptions, buildOptions) {
  const isParallelizable = transformIsParallelizable(babelOptions).isParallelizable;
  if (JOBS > 1 && isParallelizable) {
    let pool = getWorkerPool();
    _logger.debug('transformString is parallelizable');
    return pool.exec('transform', [string, serializeOptions(babelOptions)]);
  } else {
    if (JOBS <= 1) {
      _logger.debug('JOBS <= 1, skipping worker, using main thread');
    } else {
      _logger.debug('transformString is NOT parallelizable');
    }

    return new Promise(resolve => {
      resolve(transpiler.transform(string, deserializeOptions(babelOptions)));
    });
  }
}

module.exports = {
  jobs: JOBS,
  getBabelVersion,
  implementsParallelAPI,
  pluginCanBeParallelized,
  pluginsAreParallelizable,
  callbacksAreParallelizable,
  transformIsParallelizable,
  deserializeOptions,
  serializeOptions,
  buildFromParallelApiInfo,
  transformString,
  humanizePlugin
};
