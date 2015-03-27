'use strict';

var transpiler = require('babel-core');
var Filter     = require('broccoli-filter');
var clone      = require('clone');

function Babel(inputTree, options) {
  if (!(this instanceof Babel)) {
    return new Babel(inputTree, options);
  }

  this.inputTree = inputTree;
  this.options = options || {};
}

Babel.prototype = Object.create(Filter.prototype);
Babel.prototype.constructor = Babel;

Babel.prototype.extensions = ['js'];
Babel.prototype.targetExtension = 'js';

Babel.prototype.transform = function(string, options) {
  return transpiler.transform(string, options);
};

Babel.prototype.processString = function (string, relativePath) {
  var options = clone(this.options);

  options.filename = options.sourceMapName = options.sourceFileName = relativePath;

  return this.transform(string, options).code;
};

module.exports = Babel;
