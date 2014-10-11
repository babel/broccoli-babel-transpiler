'use strict';

var fs     = require('fs');
var assert = require('assert');
var rimraf = require('rimraf');

/* global afterEach: false */
afterEach(function () {
  rimraf.sync('temp');
});

it('transpile ES6 to ES5', function () {
  assert.equal(
    fs.readFileSync('temp/fixtures.js',     'utf8'),
    fs.readFileSync('fixtures/expected.js', 'utf8')
  );
});
