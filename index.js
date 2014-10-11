'use strict';

var transpiler = require('6to5');
var Filter     = require('broccoli-filter');

function TranspilerFilter(inputTree, options) {
  if (!(this instanceof TranspilerFilter)) {
    return new TranspilerFilter(inputTree, options);
  }

  this.inputTree = inputTree;
  this.options = options || {};

  this.options.sourceMap = 'inline';
  delete this.options.filename;
}

TranspilerFilter.prototype = Object.create(Filter.prototype);
TranspilerFilter.prototype.constructor = TranspilerFilter;

TranspilerFilter.prototype.extensions = ['js'];
TranspilerFilter.prototype.targetExtension = 'js';

TranspilerFilter.prototype.processString = function (string) {
  try {
    return transpiler.transform(string, this.options).code;
  } catch (err) {
    throw err;
  }
};

module.exports = TranspilerFilter;
