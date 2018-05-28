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
  return value === null ||
         typeof value === 'string' ||
         typeof value === 'number' ||
         typeof value === 'boolean' ||
         (Array.isArray(value) && value.every(valueIsSerializable)) ||
         (typeof value === 'object' && Object.keys(value).every(key => valueIsSerializable(value[key])));
}

function pluginIsSerializableArray(object) {
  return Array.isArray(object) && object.every(valueIsSerializable);
}

function pluginCanBeParallelized(plugin) {
  return typeof plugin === 'string' || implementsParallelAPI(plugin) || pluginIsSerializableArray(plugin);
}

function pluginsAreParallelizable(plugins) {
  return plugins === undefined || plugins.every(pluginCanBeParallelized);
}

function callbacksAreParallelizable(options) {
  return Object.keys(options).every(key => {
    let option = options[key];
    return typeof option !== 'function' || implementsParallelAPI(option);
  });
}

function transformIsParallelizable(options) {
  return pluginsAreParallelizable(options.plugins) &&
         callbacksAreParallelizable(options);
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
  const isParallelizable = transformIsParallelizable(babelOptions);
  if (buildOptions !== null && typeof buildOptions === 'object' && buildOptions.throwUnlessParallelizable && !isParallelizable) {
    throw new Error('BroccoliBabelTranspiler was configured to `throwUnlessParallelizable` and was unable to parallelize an plugin. Please see: https://github.com/babel/broccoli-babel-transpiler#parallel-transpilation for more details');
  }

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
};
