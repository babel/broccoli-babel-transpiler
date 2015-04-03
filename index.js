'use strict';

var transpiler = require('babel-core');
var fs         = require('fs');
var path       = require('path');
var clone      = require('clone');
var recreaddir = require('recursive-readdir');
var mkpath     = require('mkpath');
var rsvp       = require('rsvp');
var Writer     = require('broccoli-writer');

function Babel(inputTree, options) {
  if (!(this instanceof Babel)) {
    return new Babel(inputTree, options);
  }

  this.inputTree = inputTree;
  this.options = options || {};
}

Babel.prototype = Object.create(Writer.prototype);
Babel.prototype.constructor = Babel;

Babel.prototype.extensions = ['js'];
Babel.prototype.targetExtension = 'js';

Babel.prototype.transform = function(string, options) {
  return transpiler.transform(string, options);
};

Babel.prototype.copyOptions = function() {
  return clone(this.options);
};

// Promise-enabled utilities.

// Recursively go through source directory and return file list.
function deepList(dir) {
  return new rsvp.Promise(function(resolve, reject) {
    recreaddir(dir, function(err, files) {
      resolve(files.map(function(file) {
        // Normalize slashes in directories.
        return file.replace(/\\/g, '/');
      }));
    });
  });
}
// Read file; transpile it if it's JavaScript.
function readAndTranspile(loc, options) {
  var self = Babel.prototype;

  return new rsvp.Promise(function(resolve, reject) {
    fs.readFile(loc, 'utf8', function(err, data) {
      // Non-JS file.
      if(path.extname(loc) !== '.'+self.targetExtension) {
        resolve(data);
      }
      // JS file to transpile.
      else {
        resolve(transpiler.transform(data, options));
      }
    });
  });
}
// Write file.
function writeOutput(loc, data) {
  return new rsvp.Promise(function(resolve, reject) {
    var dir = path.dirname(loc);

    // Create directory (deep). mkpath will chug along happily even if dir exists.
    mkpath(dir, function() {
      // This is non-JS file data and not a Babel result object.
      if(!data.code) {
        fs.writeFile(loc, data, resolve);
      }
      // Write transpiled JS file, as well as map file, if requested.
      else {
        fs.writeFile(loc, data.code, function(err) {
          if(data.map) {
            fs.writeFile(loc+'.map', JSON.stringify(data.map), resolve);
          } else {
            resolve(err);
          }
        });
      }
    });
  });
}

Babel.prototype.write = function(readTree, destDir) {
  var self = this;

  return readTree(self.inputTree).then(function(srcDir) {

    return deepList(srcDir).then(function(files) {
      // File list is converted into promise collection as output is written.
      return rsvp.all(files.map(function(file) {
        var src = file,
            dest = file.replace(srcDir, destDir);

        var options = self.copyOptions();
        options.filename = options.sourceMapName = options.sourceFileName = src;

        return readAndTranspile(src, options).then(function(data) {
          return writeOutput(dest, data);
        });
      }));
    });

  });
};

module.exports = Babel;
