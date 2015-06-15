'use strict';

var fs     = require('fs');
var expect = require('chai').expect;
var broccoli = require('broccoli');
var path = require('path');
var Babel = require('./index');

var builder;
var inputPath = path.join(__dirname, 'fixtures');

function build(path, options) {
  builder = new broccoli.Builder(new Babel(path, options));

  return builder.build();
}

describe('options', function() {
  var options, babel;

  before(function() {
    options = {
      foo: 1,
      bar: {
        baz: 1
      },
      filterExtensions: ['es6']
    };

    babel = new Babel('foo', options);
  });

  it('are cloned', function() {
    var transpilerOptions;

    babel.transform = function(string, options) {
      transpilerOptions = options;
      return { code: {} };
    }

    expect(transpilerOptions).to.eql(undefined);
    babel.processString('path', 'relativePath');

    expect(transpilerOptions.foo).to.eql(1);
    expect(transpilerOptions.bar.baz).to.eql(1);

    options.foo = 2;
    options.bar.baz = 2;

    expect(transpilerOptions.foo).to.eql(1);
    expect(transpilerOptions.bar.baz).to.eql(1);
  });

  it('correct fileName, sourceMapName, sourceFileName', function() {
    var transpilerOptions;

    babel.transform = function(string, options) {
      transpilerOptions = options;
      return { code: {} };
    }

    expect(transpilerOptions).to.eql(undefined);
    babel.processString('path', 'relativePath');

    expect(transpilerOptions.moduleId).to.eql(undefined);
    expect(transpilerOptions.filename).to.eql('relativePath');
    expect(transpilerOptions.sourceMapName).to.eql('relativePath');
    expect(transpilerOptions.sourceFileName).to.eql('relativePath');
  });

  it('includes moduleId if options.moduleId is true', function() {
    babel.options.moduleId = true;
    babel.options.filename = 'relativePath.es6';

    var transpilerOptions;

    babel.transform = function(string, options) {
      transpilerOptions = options;
      return { code: {} };
    }

    expect(transpilerOptions).to.eql(undefined);
    babel.processString('path', 'relativePath');

    expect(transpilerOptions.moduleId).to.eql('relativePath');
  });

  it('does not propogate validExtensions', function () {
    var transpilerOptions;

    babel.transform = function(string, options) {
      transpilerOptions = options;
      return { code: {} };
    };

    expect(transpilerOptions).to.eql(undefined);
    babel.processString('path', 'relativePath');

    expect(transpilerOptions.filterExtensions).to.eql(undefined);
  });
});

describe('transpile ES6 to ES5', function() {
  afterEach(function () {
    builder.cleanup();
  });

  it('basic', function () {
    return build(inputPath, {
      inputSourceMap:false,
      sourceMap: false
    }).then(function(results) {
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

describe('filters files to transform', function() {
  afterEach(function () {
    builder.cleanup();
  });

  it('default', function () {
    return build(inputPath, {
      inputSourceMap:false,
      sourceMap: false
    }).then(function(results) {
      var outputPath = results.directory;

      var output = fs.readFileSync(path.join(outputPath, 'fixtures.js')).toString();
      var input = fs.readFileSync(path.join(inputPath,  'expected.js')).toString();

      expect(output).to.eql(input);
      // Verify that .es6 file was not transformed
      expect(fs.existsSync(path.join(outputPath, 'fixtures-es6.es6'))).to.be.ok;

    });
  });

  it('uses specified filter', function () {
    return build(inputPath, {
      filterExtensions: ['es6'],
      inputSourceMap:false,
      sourceMap: false
    }).then(function(results) {
      var outputPath = results.directory;

      var output = fs.readFileSync(path.join(outputPath, 'fixtures-es6.js')).toString();
      var input = fs.readFileSync(path.join(inputPath,  'expected.js')).toString();

      expect(output).to.eql(input);
      // Verify that .es6 file was not transformed
      expect(fs.existsSync(path.join(outputPath, 'fixtures-es6.es6'))).to.not.be.ok;

    });
  });

  it('named module', function() {
    return build(inputPath, {
      inputSourceMap: false,
      sourceMap: false,
      moduleId: "foo",
      modules: 'amdStrict'
    }).then(function(results) {
      var outputPath = results.directory;

      var output = fs.readFileSync(path.join(outputPath, 'named-module-fixture.js')).toString();
      var input = fs.readFileSync(path.join(inputPath,  'named-module.js')).toString();

      expect(output).to.eql(input);
    });
  });


  it('moduleId === true', function() {
    return build(inputPath, {
      inputSourceMap: false,
      sourceMap: false,
      moduleId: true,
      modules: 'amdStrict'
    }).then(function(results) {
      var outputPath = results.directory;

      var output = fs.readFileSync(path.join(outputPath, 'true-module-fixture.js')).toString();
      var input = fs.readFileSync(path.join(inputPath,  'true-module.js')).toString();

      expect(output).to.eql(input);
    });
  });
});

describe('module metadata', function() {
  it('exports module metadata', function() {
    return build(inputPath, {
      exportModuleMetadata: true,
      moduleId: true,
      modules: 'amdStrict',
      sourceMap: false,
      inputSourceMap: false
    }).then(function(results) {
      var outputPath = results.directory;
      var output = fs.readFileSync(path.join(outputPath , 'dep-graph.json'), 'utf8');
      var expectation = fs.readFileSync(path.join(inputPath, 'dep-graph.json'), 'utf8');
      expect(output).to.eql(expectation);
    });
  });
});
