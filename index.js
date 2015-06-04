'use strict';

var transpiler = require('babel-core');
var Filter     = require('broccoli-filter');
var clone      = require('clone');

function getExtensionsRegex(extensions) {
  return extensions.map(function(extension) {
    return new RegExp('\.' + extensions + '$');
  });
}

function replaceExtensions(extensionsRegex, name) {
  for (var i = 0, l = extensionsRegex.length; i < l; i++) {
    name = name.replace(extensionsRegex[i], '');
  }

  return name;
}

function Babel(inputTree, options) {
  if (!(this instanceof Babel)) {
    return new Babel(inputTree, options);
  }

  this.inputTree = inputTree;
  this.options = options || {};
  this.extensions = this.options.filterExtensions || ['js'];
  this.extensionsRegex = getExtensionsRegex(this.extensions);
}

Babel.prototype = Object.create(Filter.prototype);
Babel.prototype.constructor = Babel;

Babel.prototype.extensions = ['js'];
Babel.prototype.targetExtension = 'js';

Babel.prototype.transform = function(string, options) {
  return transpiler.transform(string, options);
};

Babel.prototype.processString = function (string, relativePath) {
  var options = this.copyOptions();

  options.filename = options.sourceMapName = options.sourceFileName = relativePath;

  if (options.moduleId === true) {
    options.moduleId = replaceExtensions(this.extensionsRegex, options.filename);
  }

  return this.transform(string, options).code;
};

Babel.prototype.copyOptions = function() {
  var cloned = clone(this.options);
  if (cloned.filterExtensions) {
    delete cloned.filterExtensions;
  }
  return cloned;
};

module.exports = Babel;
