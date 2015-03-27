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
  options.highlightCode = false;

  try {
    return this.transform(string, options).code;

  } catch (err) { // augment
    if (err.loc != null) {
      // Unclear if zero-indexed or one-indexed
      // https://github.com/babel/babel/issues/1106
      err.line = err.loc.line;
      err.column = err.loc.column;
    }

    // To do: err.message contains the file name and line and column, which is
    // redundant with the structured error data we already have; it would be
    // nice to get only the error message from Babel.

    if (err.codeFrame) {
      // Hopefully Broccoli will autogenerate such code frames in the future,
      // so this will become redundant
      err.message += '\n\n' + err.codeFrame;
    }

    throw err;
  }
};

module.exports = Babel;
