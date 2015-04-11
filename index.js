'use strict';

var transpiler = require('babel-core');
var Filter     = require('broccoli-persistent-filter');
var clone      = require('clone');
var crypto     = require('crypto');

function Babel(inputTree, options) {
  if (!(this instanceof Babel)) {
    return new Babel(inputTree, options);
  }

  var options = options || {};
  var extensions = options.filterExtensions || ['js'];

  this.options = copyOptions(options);
  delete this.options.filterExtensions;

  options.extensions = extensions;

  Filter.call(this, inputTree, options);
}

Babel.prototype = Object.create(Filter.prototype);
Babel.prototype.constructor = Babel;

Babel.prototype.extensions = ['js'];
Babel.prototype.targetExtension = 'js';

Babel.prototype.cacheKey = function() {
  return Filter.prototype.cacheKey.call(this) + 'some-checksum-of-the-deps';
}

Babel.prototype.cacheKeyProcessString = function(string, relativePath) {
  return crypto.createHash('md5').update(this.optionsString() + string).digest('hex');
};

Babel.prototype.transform = function(string, options) {
  return transpiler.transform(string, options);
};

Babel.prototype.processString = function (string, relativePath) {
  var options = this.options;
  options.filename = options.sourceMapName = options.sourceFileName = relativePath;

  return this.transform(string, options).code;
};

Babel.prototype.optionsString = function() {
  return (this._optionsString = JSON.stringify(this.options));
};

function copyOptions(options) {
  var cloned = clone(options);
  if (cloned.filterExtensions) {
    delete cloned.filterExtensions;
  }
  return cloned;
}

module.exports = Babel;
