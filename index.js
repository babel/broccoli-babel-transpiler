'use strict';

var transpiler = require('babel-core');
var Filter     = require('cauliflower-filter');
var clone      = require('clone');
var path       = require('path');
var fs         = require('fs');
var stringify  = require('json-stable-stringify');

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

  Filter.call(this, inputTree, options);

  this.options = options || {};
  this.extensions = this.options.filterExtensions || ['js'];
  this.extensionsRegex = getExtensionsRegex(this.extensions);
  this.moduleMetadata = {};

  if (this.options.exportModuleMetadata) {
    this.exportModuleMetadata = this.options.exportModuleMetadata;
    // Note, Babel does not support this option so we must save it then
    // delete it from the options hash
    delete this.options.exportModuleMetadata;
  }
}

Babel.prototype = Object.create(Filter.prototype);
Babel.prototype.constructor = Babel;
Babel.prototype.targetExtension = ['js'];

Babel.prototype.rebuild = function() {
  var self = this;
  return Filter.prototype.rebuild.call(this).then(function() {
    if (self.exportModuleMetadata) {
      fs.writeFileSync(self.outputPath + path.sep + 'dep-graph.json', stringify(self.moduleMetadata, {
        space: 2
      }));
    }
  });
};

Babel.prototype.transform = function(string, options) {
  return transpiler.transform(string, options);
};

Babel.prototype.processString = function (string, relativePath) {
  var options = this.copyOptions();

  options.filename = options.sourceMapName = options.sourceFileName = relativePath;

  if (options.moduleId === true) {
    options.moduleId = replaceExtensions(this.extensionsRegex, options.filename);
  }

  var transpiled = this.transform(string, options);
  var key = options.moduleId ? options.moduleId : relativePath;

  if (transpiled.metadata && transpiled.metadata.modules) {
    this.moduleMetadata[key] = transpiled.metadata.modules;
  }
  
  return transpiled.code;
};

Babel.prototype.copyOptions = function() {
  var cloned = clone(this.options);
  if (cloned.filterExtensions) {
    delete cloned.filterExtensions;
  }
  return cloned;
};

module.exports = Babel;
