'use strict';

var transpiler = require('babel-core');
var rsvp       = require('rsvp');
var Writer     = require('broccoli-writer');
var fs         = require('fs');
var path       = require('path');
var clone      = require('clone');
var walkSync   = require('walk-sync');
var mkpath     = require('mkpath');

function Babel(inputTree, options) {
  if (!(this instanceof Babel)) {
    return new Babel(inputTree, options);
  }

  this.inputTree = inputTree;
  this.options = options || {};
  this.extensions = this.options.filterExtensions || ['js'];
}

Babel.prototype = Object.create(Writer.prototype);
Babel.prototype.constructor = Babel;

Babel.prototype.extensions = ['js'];
Babel.prototype.targetExtension = 'js';

Babel.prototype.transform = function(string, options) {
  return transpiler.transform(string, options);
};

Babel.prototype.copyOptions = function() {
  var cloned = clone(this.options);
  if (cloned.filterExtensions) {
    delete cloned.filterExtensions;
  }
  return cloned;
};

// Promise-enabled utilities.

// Read file; transpile it if it's JavaScript.
function readAndTranspile(loc, options, ext) {
  return new rsvp.Promise(function(resolve, reject) {
    fs.readFile(loc, 'utf8', function(err, data) {
      // Non-target filetype.
      if(ext.indexOf(path.extname(loc).replace('.','')) === -1) {
        resolve(data);
      }
      // Target filetype to transpile.
      else {
        resolve(transpiler.transform(data, options));
      }
    });
  });
}
// Write file.
function writeOutput(loc, data, ext) {
  return new rsvp.Promise(function(resolve, reject) {
    var dir = path.dirname(loc);

    // Create directory (deep). mkpath will chug along happily even if dir exists.
    mkpath(dir, function() {
      // This is non-target file data and not a Babel result object.
      if(!data.code) {
        fs.writeFile(loc, data, resolve);
      }
      // Write transpiled JS file, as well as map file, if requested.
      else {
        var srcMapUrl = '';
        if(data.map) {
          srcMapUrl = '\n//# sourceMappingURL='+path.basename(loc)+'.map';
        }

        fs.writeFile(loc.replace(path.extname(loc), '.'+ext), data.code+srcMapUrl, function(err) {
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
    var files = walkSync(srcDir);
    files = files.filter(function(file) {
      return file.substr(-1) !== '/';
    });

    // File list is converted into promise collection as output is written.
    return rsvp.all(files.map(function(file) {
      var src = srcDir+'/'+file,
          dest = destDir+'/'+file;

      var options = self.copyOptions();
      options.filename = options.sourceMapName = options.sourceFileName = src;

      return readAndTranspile(src, options, self.extensions).then(function(data) {
        return writeOutput(dest, data, self.targetExtension);
      });
    }));

  });
};

module.exports = Babel;
