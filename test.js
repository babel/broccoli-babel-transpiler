'use strict';

var fs     = require('fs');
var expect = require('chai').expect;
var broccoli = require('broccoli');
var path = require('path');
var to5 = require('./index');

var builder;
var inputPath = path.join(__dirname, 'fixtures');

afterEach(function () {
  builder.cleanup();
});

function build(path, options) {
  builder = new broccoli.Builder(to5(path, options));

  return builder.build();
}

describe('transpile ES6 to ES5', function() {
  it('basic', function () {
    return build(inputPath, {}).then(function(results) {
      var outputPath = results.directory;

      var output = fs.readFileSync(path.join(outputPath, 'fixtures.js')).toString();
      var input = fs.readFileSync(path.join(inputPath,  'expected.js')).toString();

      expect(output).to.eql(input);
    });
  });

  it('inline source maps', function () {
    return build(inputPath, {
      sourceMap: 'inline'
    }).then(function(results) {
      var outputPath = results.directory;

      var output = fs.readFileSync(path.join(outputPath, 'fixtures.js')).toString();
      var input = fs.readFileSync(path.join(inputPath,  'expected-inline-source-maps.js')).toString();

      expect(output).to.eql(input);
    });
  });
});
