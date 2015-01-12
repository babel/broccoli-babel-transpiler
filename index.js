'use strict';

var transpiler = require('6to5-core');
var Filter     = require('broccoli-filter');

function SixToFive(inputTree, options) {
  if (!(this instanceof SixToFive)) {
    return new SixToFive(inputTree, options);
  }

  this.inputTree = inputTree;
  this.options = options || {};
}

SixToFive.prototype = Object.create(Filter.prototype);
SixToFive.prototype.constructor = SixToFive;

SixToFive.prototype.extensions = ['js'];
SixToFive.prototype.targetExtension = 'js';

SixToFive.prototype.processString = function (string, relativePath) {
  var opts = this.copyOptions();

  opts.filename = opts.sourceMapName = opts.sourceFileName = relativePath;

  return transpiler.transform(string, opts).code;
};

SixToFive.prototype.copyOptions = function() {
  return {};//
  //return JSON.parse(JSON.stringify(this.options));
};

module.exports = SixToFive;
