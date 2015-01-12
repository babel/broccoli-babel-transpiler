'use strict';

var transpiler = require('6to5-core');
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
  var opts = this.copyOptions();

  opts.filename = opts.sourceMapName = opts.sourceFileName = relativePath;

  return transpiler.transform(string, opts).code;
};

TranspilerFilter.prototype.copyOptions = function() {
  return JSON.parse(JSON.stringify(this.options));
};

module.exports = TranspilerFilter;
