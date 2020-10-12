'use strict';

const Filter     = require('broccoli-persistent-filter');
const clone      = require('clone');
const { transformString } = require('./lib/parallel-api');
const { transformIsParallelizable } = require('./lib/parallel-api');
const optionsHash = require('./lib/options-hash');
const heimdall = require('heimdalljs');

function getExtensionsRegex(extensions) {
  return extensions.map(extension => {
    return new RegExp('\.' + extension + '$');
  });
}

function replaceExtensions(extensionsRegex, name) {
  for (let i = 0, l = extensionsRegex.length; i < l; i++) {
    name = name.replace(extensionsRegex[i], '');
  }

  return name;
}

if(!heimdall.hasMonitor('babel')) {
  heimdall.registerMonitor('babel', function BabelSchema() {
    this.stringsProcessed = 0;
    this.isParallelizable = false;
  });
}

module.exports = class Babel extends Filter {
  constructor(inputTree, options = {}) {
    options.persist = 'persist' in options ? options.persist : true;
    options.async = true;

    super(inputTree, options);

    this._optionsHash = null;
    this.console = options.console || console;
    this.throwUnlessParallelizable = options.throwUnlessParallelizable;
    this.inputTree = inputTree;
    this.options = options;
    this.extensions = this.options.filterExtensions || ['js'];
    this.targetExtension = 'js';
    this.extensionsRegex = getExtensionsRegex(this.extensions);
    this.name = 'broccoli-babel-transpiler';

    if (this.options.helperWhiteList) {
      this.helperWhiteList = this.options.helperWhiteList;
    }

    let { isParallelizable, errors } = transformIsParallelizable(options.babel);

    heimdall.statsFor('babel').isParallelizable = isParallelizable;

    if ((this.throwUnlessParallelizable || process.env.THROW_UNLESS_PARALLELIZABLE) && isParallelizable === false) {
      throw new Error(this.toString() +
        ' was configured to `throwUnlessParallelizable` and was unable to parallelize a plugin. \nplugins:\n' + joinCount(errors) + '\nPlease see: https://github.com/babel/broccoli-babel-transpiler#parallel-transpilation for more details');
    }
  }

  baseDir() {
    return __dirname;
  }

  transform(string, options) {
    return transformString(string, options);
  }

  /*
    * @private
    *
    * @method optionsString
    * @returns a stringified version of the input options
    */
  optionsHash() {
    if (this._optionsHash == null) {
      this._optionsHash = optionsHash(this.options, this.console);
    }

    return this._optionsHash;
  }

  cacheKeyProcessString(string, relativePath) {
    return this.optionsHash() + Filter.prototype.cacheKeyProcessString.call(this, string, relativePath);
  }

  processString(string, relativePath) {
    heimdall.statsFor('babel').stringsProcessed++;

    let options = this.copyOptions();

    options.babel.filename = options.babel.sourceFileName = relativePath;

    if (options.babel.moduleId === true) {
      options.babel.moduleId = replaceExtensions(this.extensionsRegex, options.babel.filename);
    }

    let optionsObj = { babel: options.babel, cacheKey: this._optionsHash};
    return this.transform(string, optionsObj)
      .then(transpiled => {
        if (this.helperWhiteList) {
          let invalidHelpers = transpiled.metadata.usedHelpers.filter(helper => {
            return this.helperWhiteList.indexOf(helper) === -1;
          });

          validateHelpers(invalidHelpers, relativePath);
        }

        return transpiled.code;
      });
  }

  copyOptions() {
    let cloned = clone(this.options);
    if (cloned.filterExtensions) {
      delete cloned.filterExtensions;
    }
    if (cloned.targetExtension) {
      delete cloned.targetExtension;
    }
    return cloned;
  };
}

function joinCount(list) {
  let summary = '';

  for (let i = 0; i < list.length; i++) {
    summary += `${i + 1}: ${list[i]}\n`
  }

  return summary;
}

function validateHelpers(invalidHelpers, relativePath) {
  if (invalidHelpers.length > 0) {
    let message = relativePath + ' was transformed and relies on `' + invalidHelpers[0] + '`, which was not included in the helper whitelist. Either add this helper to the whitelist or refactor to not be dependent on this runtime helper.';

    if (invalidHelpers.length > 1) {
      let helpers = invalidHelpers.map((item, i) => {
        if (i === invalidHelpers.length - 1) {
          return '& `' + item;
        } else if (i === invalidHelpers.length - 2) {
          return item + '`, ';
        }

        return item + '`, `';
      }).join('');

      message = relativePath + ' was transformed and relies on `' + helpers + '`, which were not included in the helper whitelist. Either add these helpers to the whitelist or refactor to not be dependent on these runtime helpers.';
    }

    throw new Error(message);
  }
}
