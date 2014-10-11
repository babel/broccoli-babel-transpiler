'use strict';

var transpiler = require('6to5');
var Filter     = require('broccoli-filter');

function TranspilerFilter(inputTree, options) {
  if (!(this instanceof TranspilerFilter)) {
    return new TranspilerFilter(inputTree, options);
  }

  this.inputTree = inputTree;
  this.options = options || {};
}

TranspilerFilter.prototype = Object.create(Filter.prototype);
TranspilerFilter.prototype.constructor = TranspilerFilter;

TranspilerFilter.prototype.extensions = ['js'];
TranspilerFilter.prototype.targetExtension = 'js';

TranspilerFilter.prototype.processString = function (string, relativePath) {
  var result;
  var opts = this.options;
  opts.filename = opts.sourceMapName = opts.sourceFileName = relativePath;

  try {
    result = transpiler.transform(string, opts);

    /*
     * At this time, an array of source maps can be accessed by using
     * `result.map`, but I don't know how to write them out as files.
     *
     * Thus `sourceMap: true` has no effects yet, if you know how to solve this,
     * send a pull request in advance.
     */

    return result.code;
  } catch (err) {
    throw err;
  }
};

module.exports = TranspilerFilter;
