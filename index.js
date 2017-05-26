'use strict';

var transpiler = require('babel-core');
var Filter     = require('broccoli-persistent-filter');
var clone      = require('clone');
var path       = require('path');
var fs         = require('fs');
var stringify  = require('json-stable-stringify');
var mergeTrees = require('broccoli-merge-trees');
var funnel     = require('broccoli-funnel');
var crypto     = require('crypto');
var hashForDep = require('hash-for-dep');
var os         = require('os');
var workerpool = require('workerpool');
var Promise    = require('rsvp').Promise;

// TODO change API and remove this
var moduleResolve = require('amd-name-resolver').moduleResolve;

// create a worker pool using an external worker script
// one worker per core
// TODO - benchmark with other number of workers
var pool = workerpool.pool(__dirname + '/worker.js', { maxWorkers: os.cpus().length });



function getExtensionsRegex(extensions) {
  return extensions.map(function(extension) {
    return new RegExp('\.' + extension + '$');
  });
}

function replaceExtensions(extensionsRegex, name) {
  for (var i = 0, l = extensionsRegex.length; i < l; i++) {
    name = name.replace(extensionsRegex[i], '');
  }

  return name;
}

function pluginCanBeParallelized(plugin) {
  return typeof plugin === 'string' ||
         (Object.prototype.toString.call(plugin) === '[object Array]' &&
          plugin.length === 3 &&
          typeof (plugin[0]) === 'string' &&
          typeof (plugin[1]) === 'string');
}

function pluginsAreParallelizable(plugins) {
  var retval = plugins === undefined || plugins.every(pluginCanBeParallelized);
  return retval;
}

function resolveModuleIsParallelizable(resolveModule) {
  return resolveModule === undefined ||
         (typeof resolveModule=== 'function' && resolveModule === moduleResolve);
}

function transformIsParallelizable(options) {
  var plugins = options.plugins;
  var resolveModuleFunction = options.resolveModuleSource;

  return pluginsAreParallelizable(plugins) && resolveModuleIsParallelizable(resolveModuleFunction);
}


function Babel(inputTree, _options) {
  if (!(this instanceof Babel)) {
    return new Babel(inputTree, _options);
  }

  var options = _options || {};
  options.persist = 'persist' in options ? options.persist : true;
  options.async = true;
  Filter.call(this, inputTree, options);

  delete options.persist;
  delete options.async; // TODO do I need to do this?
  delete options.annotation;
  delete options.description;

  this.console = options.console || console;
  delete options.console;

  this.options = options;
  this.extensions = this.options.filterExtensions || ['js'];
  this.extensionsRegex = getExtensionsRegex(this.extensions);
  this.name = 'broccoli-babel-transpiler';

  if (this.options.helperWhiteList) {
    this.helperWhiteList = this.options.helperWhiteList;
  }

  // Note, Babel does not support this option so we must save it then
  // delete it from the options hash
  delete this.options.helperWhiteList;

  if (this.options.browserPolyfill) {
    var babelCorePath = require.resolve('babel-core');
    babelCorePath = babelCorePath.replace(/\/babel-core\/.*$/, '/babel-core');

    var polyfill = funnel(babelCorePath, { files: ['browser-polyfill.js'] });
    this.inputTree = mergeTrees([polyfill, inputTree]);
  } else {
    this.inputTree = inputTree;
  }
  delete this.options.browserPolyfill;
}

Babel.prototype = Object.create(Filter.prototype);
Babel.prototype.constructor = Babel;
Babel.prototype.targetExtension = ['js'];

Babel.prototype.baseDir = function() {
  return __dirname;
};

Babel.prototype.transform = function(string, options) {
  if (transformIsParallelizable(options)) {
    // TODO - need to change the API for this as well...
    // (so it will also be passthrough too)
    // just set this to true, the worker will take care of re-wiring this
    options.resolveModuleSource_amd = true;
    delete options.resolveModuleSource;

    // (plugins is a passthrough)

    // send the job to the worker pool
    return new Promise(function(resolve, reject) {
      pool.exec('transform', [string, options])
      .then(
        function onResolved(result) {
          resolve(result);
        },
        function onRejected(err) {
          if (err.name === 'Error' && (err.message === 'Worker terminated unexpectedly' ||
                                       err.message === 'Worker is terminated')) {
            // retry if it's a worker error
            resolve(pool.exec('transform', [string, options]));
          }
          else {
            reject(err);
          }
        }
      );
    });
  }
  else {
    return Promise.resolve(transpiler.transform(string, options));
  }
};

/*
 * @private
 *
 * @method optionsString
 * @returns a stringified version of the input options
 */
Babel.prototype.optionsHash = function() {
  var options = this.options;
  var hash = {};
  var key, value;

  if (!this._optionsHash) {
    for (key in options) {
      value = options[key];
      hash[key] = (typeof value === 'function') ? (value + '') : value;
    }

    if (options.plugins) {
      hash.plugins = [];

      var cacheableItems = options.plugins.slice();

      for (var i = 0; i < cacheableItems.length; i++) {
        var item = cacheableItems[i];

        var type = typeof item;
        var augmentsCacheKey = false;
        var providesBaseDir = false;
        var requiresBaseDir = true;

        if (type === 'function') {
          augmentsCacheKey = typeof item.cacheKey === 'function';
          providesBaseDir = typeof item.baseDir === 'function';

          if (augmentsCacheKey) {
            hash.plugins.push(item.cacheKey());
          }

          if (providesBaseDir) {
            var depHash = hashForDep(item.baseDir());

            hash.plugins.push(depHash);
          }

          if (!providesBaseDir && requiresBaseDir){
            // prevent caching completely if the plugin doesn't provide baseDir
            // we cannot ensure that we aren't causing invalid caching pain...
            this.console.warn('broccoli-babel-transpiler is opting out of caching due to a plugin that does not provide a caching strategy: `' + item + '`.');
            hash.plugins.push((new Date).getTime() + '|' + Math.random());
            break;
          }
        } else if (Array.isArray(item)) {
          item.forEach(function(part) {
            cacheableItems.push(part);
          });

          continue;
        } else if (type !== 'object' || item === null) {
          // handle native strings, numbers, or null (which can JSON.stringify properly)
          hash.plugins.push(item);
          continue;
        } else if (type === 'object') {
          // iterate all keys in the item and push them into the cache
          var keys = Object.keys(item);
          keys.forEach(function(key) {
            cacheableItems.push(key);
            cacheableItems.push(item[key]);
          });
          continue;
        } else {
          this.console.warn('broccoli-babel-transpiler is opting out of caching due to an non-cacheable item: `' + item + '` (' + type + ').');
          hash.plugins.push((new Date).getTime() + '|' + Math.random());
          break;
        }
      }
    }

    this._optionsHash = crypto.createHash('md5').update(stringify(hash), 'utf8').digest('hex');
  }

  return this._optionsHash;
};

Babel.prototype.cacheKeyProcessString = function(string, relativePath) {
  return this.optionsHash() + Filter.prototype.cacheKeyProcessString.call(this, string, relativePath);
};

Babel.prototype.processString = function(string, relativePath) {
  var options = this.copyOptions();

  options.filename = options.sourceMapTarget = options.sourceFileName = relativePath;

  if (options.moduleId === true) {
    options.moduleId = replaceExtensions(this.extensionsRegex, options.filename);
  }

  var plugin = this;
  return this.transform(string, options)
  .then(function (transpiled) {

    if (plugin.helperWhiteList) {
      var invalidHelpers = transpiled.metadata.usedHelpers.filter(function(helper) {
        return plugin.helperWhiteList.indexOf(helper) === -1;
      }, plugin);

      validateHelpers(invalidHelpers, relativePath);
    }

    return transpiled.code;
  });
};

Babel.prototype.copyOptions = function() {
  var cloned = clone(this.options);
  if (cloned.filterExtensions) {
    delete cloned.filterExtensions;
  }
  return cloned;
};

function validateHelpers(invalidHelpers, relativePath) {
  if (invalidHelpers.length > 0) {
    var message = relativePath + ' was transformed and relies on `' + invalidHelpers[0] + '`, which was not included in the helper whitelist. Either add this helper to the whitelist or refactor to not be dependent on this runtime helper.';

    if (invalidHelpers.length > 1) {
      var helpers = invalidHelpers.map(function(item, i) {
        if (i === invalidHelpers.length - 1) {
          return '& `' + item;
        } else if (i === invalidHelpers.length - 2) {
          return item + '`, ';
        }

        return item + '`, `';
      }).join('');

      message = relativePath + ' was transformed and relies on `' + helpers + '`, which were not included in the helper whitelist. Either add these helpers to the whitelist or refactor to not be dependent on these runtime helper.';
    }

    throw new Error(message);
  }
}

module.exports = Babel;
