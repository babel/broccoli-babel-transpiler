'use strict';

var fs = require('fs');
var os = require('os');
var expect = require('chai').expect;
var broccoli = require('broccoli');
var path = require('path');
var Babel = require('./index');
var helpers = require('broccoli-test-helpers');
var stringify = require('json-stable-stringify');
var mkdirp = require('mkdirp').sync;
var makeTestHelper = helpers.makeTestHelper;
var cleanupBuilders = helpers.cleanupBuilders;
var Promise = require('rsvp').Promise;
var moduleResolve = require('amd-name-resolver').moduleResolve;
var ParallelApi = require('./lib/parallel-api');

var inputPath = path.join(__dirname, 'fixtures');
var expectations = path.join(__dirname, 'expectations');

var moduleResolveParallel = { parallelAPI: [fixtureFullPath('amd-name-resolver-parallel'), {}] };
var getModuleIdParallel = { parallelAPI: [fixtureFullPath('get-module-id-parallel'), { name: 'testModule' }] };
var shouldPrintCommentParallel = { parallelAPI: [fixtureFullPath('print-comment-parallel'), { contents: 'comment 1' }] };

var babel;

function fixtureFullPath(filename) {
  return path.join(__dirname, 'fixtures', filename);
}

describe('options', function() {
  var options;

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
      return Promise.resolve({ code: {} });
    };

    expect(transpilerOptions).to.eql(undefined);
    babel.processString('path', 'relativePath');

    expect(transpilerOptions.foo).to.eql(1);
    expect(transpilerOptions.bar.baz).to.eql(1);

    options.foo = 2;
    options.bar.baz = 2;

    expect(transpilerOptions.foo).to.eql(1);
    expect(transpilerOptions.bar.baz).to.eql(1);
  });

  it('correct fileName, sourceMapTarget, sourceFileName', function() {
    var transpilerOptions;

    babel.transform = function(string, options) {
      transpilerOptions = options;
      return Promise.resolve({ code: {} });
    };

    expect(transpilerOptions).to.eql(undefined);
    babel.processString('path', 'relativePath');

    expect(transpilerOptions.moduleId).to.eql(undefined);
    expect(transpilerOptions.filename).to.eql('relativePath');
    expect(transpilerOptions.sourceMapTarget).to.eql('relativePath');
    expect(transpilerOptions.sourceFileName).to.eql('relativePath');
  });

  it('includes moduleId if options.moduleId is true', function() {
    babel.options.moduleId = true;
    babel.options.filename = 'relativePath.es6';

    var transpilerOptions;

    babel.transform = function(string, options) {
      transpilerOptions = options;
      return Promise.resolve({ code: {} });
    };

    expect(transpilerOptions).to.eql(undefined);
    babel.processString('path', 'relativePath');

    expect(transpilerOptions.moduleId).to.eql('relativePath');
  });

  it('does not propagate validExtensions', function () {
    var transpilerOptions;

    babel.transform = function(string, options) {
      transpilerOptions = options;
      return Promise.resolve({ code: {} });
    };

    expect(transpilerOptions).to.eql(undefined);
    babel.processString('path', 'relativePath');

    expect(transpilerOptions.filterExtensions).to.eql(undefined);
  });
});

describe('transpile ES6 to ES5', function() {

  before(function() {
    babel = makeTestHelper({
      subject: function() {
        return new Babel(arguments[0], arguments[1]);
      },
      fixturePath: inputPath
    });
  });

  afterEach(function () {
    return cleanupBuilders();
  });

  it('basic', function () {
    return babel('files', {
      inputSourceMap: false,
      sourceMap: false,
      plugins: [
        'transform-strict-mode',
        'transform-es2015-block-scoping'
      ]
    }).then(function(results) {
      var outputPath = results.directory;

      var output = fs.readFileSync(path.join(outputPath, 'fixtures.js'), 'utf8');
      var input = fs.readFileSync(path.join(expectations, 'expected.js'), 'utf8');

      expect(output).to.eql(input);
    });
  });

  it('basic - parallel API', function () {
    return babel('files', {
      inputSourceMap: false,
      sourceMap: false,
      plugins: [
        ['transform-strict-mode-||', fixtureFullPath('transform-strict-mode-parallel'), {}],
        ['transform-es2015-block-scoping-||', fixtureFullPath('transform-es2015-block-scoping-parallel'), {}]
      ]
    }).then(function(results) {
      var outputPath = results.directory;

      var output = fs.readFileSync(path.join(outputPath, 'fixtures.js'), 'utf8');
      var input = fs.readFileSync(path.join(expectations, 'expected.js'), 'utf8');

      expect(output).to.eql(input);
    });
  });

  it('basic - parallel API (in main process)', function () {
    var pluginFunction = require('babel-plugin-transform-es2015-block-scoping');
    pluginFunction.baseDir = function() {
      return path.join(__dirname, 'node_modules', 'babel-plugin-transform-es2015-block-scoping');
    };
    return babel('files', {
      inputSourceMap: false,
      sourceMap: false,
      plugins: [
        ['some-plugin-||', fixtureFullPath('transform-strict-mode-parallel'), {}],
        pluginFunction,
      ]
    }).then(function(results) {
      var outputPath = results.directory;

      var output = fs.readFileSync(path.join(outputPath, 'fixtures.js'), 'utf8');
      var input = fs.readFileSync(path.join(expectations, 'expected.js'), 'utf8');

      expect(output).to.eql(input);
    });
  });

  it('basic (in main process)', function () {
    var pluginFunction = require('babel-plugin-transform-strict-mode');
    pluginFunction.baseDir = function() {
      return path.join(__dirname, 'node_modules', 'babel-plugin-transform-strict-mode');
    };
    return babel('files', {
      inputSourceMap: false,
      sourceMap: false,
      // cannot parallelize if any of the plugins are functions
      plugins: [
        pluginFunction,
        'transform-es2015-block-scoping'
      ]
    }).then(function(results) {
      var outputPath = results.directory;

      var output = fs.readFileSync(path.join(outputPath, 'fixtures.js'), 'utf8');
      var input = fs.readFileSync(path.join(expectations, 'expected.js'), 'utf8');

      expect(output).to.eql(input);
    });
  });

  it('inline source maps', function () {
    return babel('files', {
      sourceMap: 'inline',
      plugins: [
        'transform-strict-mode',
        'transform-es2015-block-scoping'
      ]
    }).then(function(results) {
      var outputPath = results.directory;

      var output = fs.readFileSync(path.join(outputPath, 'fixtures.js'), 'utf8');
      var input = fs.readFileSync(path.join(expectations, 'expected-inline-source-maps.js'), 'utf8');

      expect(output).to.eql(input);
    });
  });

  it('modules (in main process)', function () {
    return babel('files', {
      inputSourceMap: false,
      sourceMap: false,
      plugins: [
        'transform-strict-mode',
        'transform-es2015-block-scoping'
      ],
      resolveModuleSource: moduleResolve
    }).then(function(results) {
      var outputPath = results.directory;

      var output = fs.readFileSync(path.join(outputPath, 'fixtures-imports.js'), 'utf8');
      var input = fs.readFileSync(path.join(expectations, 'imports.js'), 'utf8');

      expect(output).to.eql(input);
    });
  });

  it('modules - parallel API', function () {
    return babel('files', {
      inputSourceMap: false,
      sourceMap: false,
      plugins: [
        'transform-strict-mode',
        'transform-es2015-block-scoping'
      ],
      resolveModuleSource: moduleResolveParallel
    }).then(function(results) {
      var outputPath = results.directory;

      var output = fs.readFileSync(path.join(outputPath, 'fixtures-imports.js'), 'utf8');
      var input = fs.readFileSync(path.join(expectations, 'imports.js'), 'utf8');

      expect(output).to.eql(input);
    });
  });

  it('module IDs (in main process)', function () {
    return babel('files', {
      plugins: [
        'transform-es2015-modules-amd'
      ],
      moduleIds: true,
      getModuleId: function(moduleName) { return 'testModule'; },
    }).then(function(results) {
      var outputPath = results.directory;

      var output = fs.readFileSync(path.join(outputPath, 'fixtures-imports.js'), 'utf8');
      var input = fs.readFileSync(path.join(expectations, 'imports-getModuleId.js'), 'utf8');

      expect(output).to.eql(input);
    });
  });

  it('module IDs - parallel API', function () {
    return babel('files', {
      plugins: [
        'transform-es2015-modules-amd'
      ],
      moduleIds: true,
      getModuleId: getModuleIdParallel,
    }).then(function(results) {
      var outputPath = results.directory;

      var output = fs.readFileSync(path.join(outputPath, 'fixtures-imports.js'), 'utf8');
      var input = fs.readFileSync(path.join(expectations, 'imports-getModuleId.js'), 'utf8');

      expect(output).to.eql(input);
    });
  });

  it('shouldPrintComment (in main process)', function () {
    return babel('files', {
      shouldPrintComment: function(comment) { return comment === 'comment 1'; },
    }).then(function(results) {
      var outputPath = results.directory;
      var output = fs.readFileSync(path.join(outputPath, 'fixtures-comments.js'), 'utf8');
      var input = fs.readFileSync(path.join(expectations, 'comments.js'), 'utf8');
      expect(output).to.eql(input);
    });
  });

  it('shouldPrintComment - parallel API', function () {
    return babel('files', {
      shouldPrintComment: shouldPrintCommentParallel,
    }).then(function(results) {
      var outputPath = results.directory;
      var output = fs.readFileSync(path.join(outputPath, 'fixtures-comments.js'), 'utf8');
      var input = fs.readFileSync(path.join(expectations, 'comments.js'), 'utf8');
      expect(output).to.eql(input);
    });
  });
});

describe('filters files to transform', function() {

  before(function() {
    babel = makeTestHelper({
      subject: function() {
        return new Babel(arguments[0], arguments[1]);
      },
      fixturePath: inputPath
    });
  });

  afterEach(function () {
    return cleanupBuilders();
  });

  it('default', function () {
    return babel('files', {
      inputSourceMap:false,
      sourceMap: false,
      plugins: [
        'transform-strict-mode',
        'transform-es2015-block-scoping'
      ]
    }).then(function(results) {
      var outputPath = results.directory;

      var output = fs.readFileSync(path.join(outputPath, 'fixtures.js'), 'utf8');
      var input = fs.readFileSync(path.join(expectations, 'expected.js'), 'utf8');

      expect(output).to.eql(input);
      // Verify that .es6 file was not transformed
      expect(fs.existsSync(path.join(outputPath, 'fixtures-es6.es6'))).to.be.ok;

    });
  });

  it('uses specified filter', function () {
    return babel('files', {
      filterExtensions: ['es6'],
      inputSourceMap: false,
      sourceMap: false,
      plugins: [
        'transform-strict-mode',
        'transform-es2015-block-scoping'
      ]
    }).then(function(results) {
      var outputPath = results.directory;

      var output = fs.readFileSync(path.join(outputPath, 'fixtures-es6.js'), 'utf8');
      var input = fs.readFileSync(path.join(expectations, 'expected.js'), 'utf8');

      expect(output).to.eql(input);
      // Verify that .es6 file was not transformed
      expect(fs.existsSync(path.join(outputPath, 'fixtures-es6.es6'))).to.not.be.ok;

    });
  });

  it('uses multiple specified filters', function() {
    return babel('files', {
      filterExtensions: ['js', 'es6'],
      inputSourceMap: false,
      sourceMap: false,
      plugins: [
        'transform-strict-mode',
        'transform-es2015-block-scoping'
      ]
    }).then(function(results) {
      var outputPath = results.directory;

      var es6ExtOutput = fs.readFileSync(path.join(outputPath, 'fixtures-es6.js'), 'utf8');
      var jsExtOutput = fs.readFileSync(path.join(outputPath, 'fixtures.js'), 'utf8');
      var input = fs.readFileSync(path.join(expectations, 'expected.js'), 'utf8');

      expect(es6ExtOutput).to.eql(input);
      expect(jsExtOutput).to.eql(input);
      // Verify that .es6 file was not transformed
      expect(fs.existsSync(path.join(outputPath, 'fixtures-es6.es6'))).to.not.be.ok;
    });
  });

  it('named module', function() {
    return babel('files', {
      inputSourceMap: false,
      sourceMap: false,
      moduleId: "foo",
      plugins: [
        'transform-es2015-modules-amd',
        'transform-es2015-block-scoping'
      ]
    }).then(function(results) {
      var outputPath = results.directory;

      var output = fs.readFileSync(path.join(outputPath, 'named-module-fixture.js'), 'utf8');
      var input = fs.readFileSync(path.join(expectations, 'named-module.js'), 'utf8');

      expect(output).to.eql(input);
    });
  });


  it('moduleId === true', function() {
    return babel('files', {
      inputSourceMap: false,
      sourceMap: false,
      moduleId: true,
      plugins: [
        'transform-es2015-modules-amd',
        'transform-es2015-block-scoping'
      ]
    }).then(function(results) {
      var outputPath = results.directory;

      var output = fs.readFileSync(path.join(outputPath, 'true-module-fixture.js'), 'utf8');
      var input = fs.readFileSync(path.join(expectations, 'true-module.js'), 'utf8');

      expect(output).to.eql(input);
    });
  });

  it('throws if a single helper is not whitelisted', function() {
    return babel('file', {
      helperWhiteList: ['classCallCheck', 'possibleConstructorReturn'],
      plugins: ['transform-es2015-classes']
    }).catch(function(err) {
      expect(err.message).to.match(/^fixtures.js was transformed and relies on `inherits`, which was not included in the helper whitelist. Either add this helper to the whitelist or refactor to not be dependent on this runtime helper.$/);
    });
  });

  it('throws if multiple helpers are not whitelisted', function() {
    return babel('file', {
      helperWhiteList: [],
      plugins: ['transform-es2015-classes']
    }).catch(function(err) {
      expect(err.message).to.match(/^fixtures.js was transformed and relies on `[a-zA-Z]+`, `[a-zA-Z]+`, & `[a-zA-z]+`, which were not included in the helper whitelist. Either add these helpers to the whitelist or refactor to not be dependent on these runtime helpers.$/);
    });
  });

  it('does not throw if helpers are specified', function() {
    return babel('files', {
      helperWhiteList: ['classCallCheck', 'possibleConstructorReturn', 'inherits'],
      plugins: ['transform-es2015-classes']
    }).then(function(results) {
      var outputPath = results.directory;
      var output = fs.readFileSync(path.join(outputPath, 'fixtures-classes.js'), 'utf8');
      var input = fs.readFileSync(path.join(expectations, 'classes.js'), 'utf8');
      expect(output).to.eql(input);
    });
  });
});

describe('consume broccoli-babel-transpiler options', function() {
  it('enabled', function() {
    var options = {
      browserPolyfill: true
    };

    babel = new Babel('foo', options);
    var code = babel.processString('path', 'relativePath');
    expect(code).to.be.ok;
  });

  it('explicitly disabled', function() {
    var options = {
      browserPolyfill: false
    };

    babel = new Babel('foo', options);
    var code = babel.processString('path', 'relativePath');
    expect(code).to.be.ok;
  });
});

describe('when options change', function() {
  var originalHash, options, fakeConsole, consoleMessages;

  beforeEach(function() {
    fakeConsole = {
      warn: function(message) { consoleMessages.push(message); }
    };
    consoleMessages = [];

    options = {
      bar: 1,
      baz: function() {},
      console: fakeConsole,
      plugins: []
    };

    var babel = new Babel('foo', options);

    originalHash = babel.optionsHash();
  });

  it('clears cache for added properties', function() {
    options.foo = 1;
    options.console = fakeConsole;
    var babelNew = new Babel('foo', options);

    expect(babelNew.optionsHash()).to.not.eql(originalHash);
  });

  it('includes object plugins cacheKey result in hash', function() {
    options.plugins = [
      { cacheKey: function() { return 'hi!'; }}
    ];
    options.console = fakeConsole;
    var babelNew = new Babel('foo', options);

    expect(babelNew.optionsHash()).to.not.eql(originalHash);
  });

  it('includes function plugins cacheKey result in hash', function() {
    function fakePlugin() {}
    fakePlugin.cacheKey = function() { return 'Hi!'; };

    options.plugins = [
      fakePlugin
    ];
    options.console = fakeConsole;
    var babelNew = new Babel('foo', options);

    expect(babelNew.optionsHash()).to.not.eql(originalHash);
  });

  it('includes string plugins in hash calculation', function() {
    options.plugins = [
      'foo'
    ];
    options.console = fakeConsole;
    var babelNew = new Babel('foo', options);

    expect(babelNew.optionsHash()).to.not.eql(originalHash);
  });

  it('includes plugins specified with options in hash calculation when cacheable', function() {
    var pluginOptions = { foo: 'bar' };
    options.plugins = [
      ['foo', pluginOptions]
    ];
    options.console = fakeConsole;
    var first = new Babel('foo', options);
    var firstOptions = first.optionsHash();

    options.console = fakeConsole;
    var second = new Babel('foo', options);
    var secondOptions = second.optionsHash();
    expect(firstOptions).to.eql(secondOptions);

    pluginOptions.qux = 'huzzah';
    options.console = fakeConsole;
    var third = new Babel('foo', options);
    var thirdOptions = third.optionsHash();

    expect(firstOptions).to.not.eql(thirdOptions);
  });

  it('invalidates plugins specified with options when not-cacheable', function() {
    function thing() { }
    var pluginOptions = { foo: 'bar', thing: thing };
    options.plugins = [
      ['foo', pluginOptions]
    ];
    options.console = fakeConsole;
    var first = new Babel('foo', options);
    var firstOptions = first.optionsHash();

    options.console = fakeConsole;
    var second = new Babel('foo', options);
    var secondOptions = second.optionsHash();
    expect(firstOptions).to.not.eql(secondOptions);
  });

  it('plugins specified with options can have functions with `baseDir`', function() {
    var dir = path.join(inputPath, 'plugin-a');
    function thing() { }
    thing.baseDir = function() { return dir; };
    var pluginOptions = { foo: 'bar', thing: thing };
    options.plugins = [
      ['foo', pluginOptions]
    ];

    options.console = fakeConsole;
    var first = new Babel('foo', options);
    var firstOptions = first.optionsHash();

    options.console = fakeConsole;
    var second = new Babel('foo', options);
    var secondOptions = second.optionsHash();
    expect(firstOptions).to.eql(secondOptions);

    dir = path.join(inputPath, 'plugin-b');
    options.console = fakeConsole;
    var third = new Babel('foo', options);
    var thirdOptions = third.optionsHash();

    expect(firstOptions).to.not.eql(thirdOptions);
  });

  it('a plugins `baseDir` method is used for hash generation', function() {
    var dir = path.join(inputPath, 'plugin-a');

    function plugin() {}
    plugin.baseDir = function() {
      return dir;
    };
    options.plugins = [ plugin ];

    options.console = fakeConsole;
    var first = new Babel('foo', options);
    var firstOptions = first.optionsHash();

    dir = path.join(inputPath, 'plugin-b');
    options.console = fakeConsole;
    var second = new Babel('foo', options);
    var secondOptions = second.optionsHash();

    expect(firstOptions).to.not.eql(secondOptions);
  });

  it('a plugin without a baseDir invalidates the cache every time', function() {
    function plugin() {}
    plugin.toString = function() { return '<derp plugin>'; };
    options.plugins = [ plugin ];

    options.console = fakeConsole;
    var babel1 = new Babel('foo', options);
    options.console = fakeConsole;
    var babel2 = new Babel('foo', options);

    expect(babel1.optionsHash()).to.not.eql(babel2.optionsHash());
    expect(consoleMessages).to.eql([
      'broccoli-babel-transpiler is opting out of caching due to a plugin that does not provide a caching strategy: `<derp plugin>`.',
      'broccoli-babel-transpiler is opting out of caching due to a plugin that does not provide a caching strategy: `<derp plugin>`.'
    ]);
  });

  it('clears cache for updated properties', function() {
    options.bar = 2;
    options.console = fakeConsole;
    var babelNew = new Babel('foo', options);

    expect(babelNew.optionsHash()).to.not.eql(originalHash);
  });

  it('clears cache for added methods', function() {
    options.foo = function() {};
    options.console = fakeConsole;
    var babelNew = new Babel('foo', options);

    expect(babelNew.optionsHash()).to.not.eql(originalHash);
  });

  it('clears cache for updated methods', function() {
    options.baz = function() { return 1; };
    options.console = fakeConsole;
    var babelNew = new Babel('foo', options);

    expect(babelNew.optionsHash()).to.not.eql(originalHash);
  });
});

describe('on error', function() {

  before(function() {
    babel = makeTestHelper({
      subject: function() {
        return new Babel(arguments[0], arguments[1]);
      },
      fixturePath: inputPath
    });
  });

  afterEach(function () {
    return cleanupBuilders();
  });

  it('returns error from the main process', function () {
    var pluginFunction = require('babel-plugin-transform-strict-mode');
    pluginFunction.baseDir = function() {
      return path.join(__dirname, 'node_modules', 'babel-plugin-transform-strict-mode');
    };
    return babel('errors', {
      inputSourceMap: false,
      sourceMap: false,
      plugins: [
        pluginFunction,
        'transform-es2015-block-scoping'
      ]
    }).then(
      function onSuccess(results) {
        expect.fail('', '', 'babel should throw an error');
      },
      function onFailure(err) {
        expect(err.message).to.eql('fixtures.js: Unexpected token (1:9)');
      }
    );
  });

  it('returns error from a worker process', function () {
    return babel('errors', {
      inputSourceMap: false,
      sourceMap: false,
      plugins: [
        'transform-strict-mode',
        'transform-es2015-block-scoping'
      ]
    }).then(
      function onSuccess(results) {
        expect.fail('', '', 'babel should throw an error');
      },
      function onFailure(err) {
        expect(err.message).to.eql('fixtures.js: Unexpected token (1:9)');
      }
    );
  });

  it('fails if worker process is terminated', function () {
    return babel('files', {
      inputSourceMap: false,
      sourceMap: false,
      plugins: [
        ['transform-strict-mode-||', fixtureFullPath('transform-strict-mode-process-exit'), {}],
        'transform-es2015-block-scoping'
      ]
    }).then(
      function onSuccess(results) {
        expect.fail('', '', 'babel should throw an error');
      },
      function onFailure(err) {
        expect(err.message).to.eql('Worker terminated unexpectedly');
      }
    );
  });
});

describe('transformOptions()', function() {

  it('passes other options through', function () {
    var options = {
      inputSourceMap: false,
      sourceMap: false,
      somethingElse: 'foo',
    };
    expect(ParallelApi.transformOptions(options)).to.eql({
      inputSourceMap: false,
      sourceMap: false,
      somethingElse: 'foo',
    });
  });

  it('passes through plugins that do not use the parallel API', function () {
    var pluginFunction = function doSomething() {
      return 'something';
    };
    var options = {
      plugins: [
        pluginFunction,
        'transform-strict-mode',
        'transform-es2015-block-scoping',
        [ 'something' ],
        [ 'something', 'else' ],
        [ { objects: 'should' }, { be: 'passed'}, 'through'],
      ]
    };
    expect(ParallelApi.transformOptions(options)).to.eql({
      plugins: [
        pluginFunction,
        'transform-strict-mode',
        'transform-es2015-block-scoping',
        [ 'something' ],
        [ 'something', 'else' ],
        [ { objects: 'should' }, { be: 'passed'}, 'through'],
      ]
    });
  });

  it('builds plugins using the parallel API', function () {
    var options = {
      plugins: [
        ['some plugins name', fixtureFullPath('transform-strict-mode-parallel'), { foo: 'bar' }],
        'transform-es2015-block-scoping'
      ]
    };
    expect(ParallelApi.transformOptions(options)).to.eql({
      plugins: [
        'transform-strict-mode',
        'transform-es2015-block-scoping'
      ]
    });
  });

  it('leaves callback functions alone', function () {
    var moduleNameFunc = function(moduleName) {};
    var commentFunc = function(comment) {};
    var options = {
      resolveModuleSource: moduleResolve,
      getModuleId: moduleNameFunc,
      shouldPrintComment: commentFunc,
      // TODO more callbacks
    };
    expect(ParallelApi.transformOptions(options)).to.eql({
      resolveModuleSource: moduleResolve,
      getModuleId: moduleNameFunc,
      shouldPrintComment: commentFunc,
    });
  });

  it('builds resolveModuleSource using the parallel API', function () {
    var options = {
      resolveModuleSource: moduleResolveParallel
    };
    expect(ParallelApi.transformOptions(options)).to.eql({
      resolveModuleSource: moduleResolve
    });
  });

  it('builds getModuleId using the parallel API', function () {
    var options = {
      getModuleId: getModuleIdParallel
    };
    expect(ParallelApi.transformOptions(options).getModuleId).to.be.a('function');
  });

  it('builds shouldPrintComment using the parallel API', function () {
    var options = {
      shouldPrintComment: shouldPrintCommentParallel
    };
    expect(ParallelApi.transformOptions(options).shouldPrintComment).to.be.a('function');
  });

  it('throws error if parallel API is wrong format', function () {
    var options = {
      getModuleId: { parallelAPI: ['wrong'] },
    };
    try {
      ParallelApi.transformOptions(options);
      expect.fail('', '', 'transformOption should throw error');
    }
    catch (err) {
      expect(err.message).to.eql('getModuleId: wrong format for parallelAPI');
    }
  });
});

describe('pluginUsesParallelAPI()', function() {
  it('string - no', function () {
    expect(ParallelApi.pluginUsesParallelAPI('transform-es2025')).to.eql(false);
  });

  it('function - no', function () {
    expect(ParallelApi.pluginUsesParallelAPI(function() {})).to.eql(false);
  });

  it('[] - no', function () {
    expect(ParallelApi.pluginUsesParallelAPI([])).to.eql(false);
  });

  it('["plugin-name", { options }] - no', function () {
    expect(ParallelApi.pluginUsesParallelAPI(['plugin-name', {foo: 'bar'}])).to.eql(false);
  });

  it('[{ object }, { options }] - no', function () {
    expect(ParallelApi.pluginUsesParallelAPI([{some: 'object'}, {foo: 'bar'}])).to.eql(false);
  });

  it('["plugin-name", "file/to/require", { options }] - yes', function () {
    expect(ParallelApi.pluginUsesParallelAPI(['plugin-name', 'file/to/require', {foo: 'bar'}])).to.eql(true);
  });
});

describe('pluginCanBeParallelized()', function() {
  it('string - yes', function () {
    expect(ParallelApi.pluginCanBeParallelized('transform-es2025')).to.eql(true);
  });

  it('function - no', function () {
    expect(ParallelApi.pluginCanBeParallelized(function() {})).to.eql(false);
  });

  it('[] - no', function () {
    expect(ParallelApi.pluginCanBeParallelized([])).to.eql(false);
  });

  it('["plugin-name", { options }] - no', function () {
    expect(ParallelApi.pluginCanBeParallelized(['plugin-name', {foo: 'bar'}])).to.eql(false);
  });

  it('["plugin-name", "file/to/require", { options }] - yes', function () {
    expect(ParallelApi.pluginCanBeParallelized(['plugin-name', 'file/to/require', {foo: 'bar'}])).to.eql(true);
  });
});

describe('pluginsAreParallelizable()', function() {
  it('undefined - yes', function () {
    expect(ParallelApi.pluginsAreParallelizable(undefined)).to.eql(true);
  });

  it('[] - yes', function () {
    expect(ParallelApi.pluginsAreParallelizable([])).to.eql(true);
  });

  it('array of plugins that are parllelizable - yes', function () {
    var plugins = [
      'some-plugin',
      'some-other-plugin',
      ['plugin-name', 'file/to/require', {foo: 'bar'}],
    ];
    expect(ParallelApi.pluginsAreParallelizable(plugins)).to.eql(true);
  });

  it('one plugin is not parallelizable - no', function () {
    var plugins = [
      'some-plugin',
      'some-other-plugin',
      ['plugin-name', 'file/to/require', {foo: 'bar'}],
      function() {},
    ];
    expect(ParallelApi.pluginsAreParallelizable(plugins)).to.eql(false);
  });
});


describe('callbacksAreParallelizable()', function() {
  it('no callback functions - yes', function () {
    var options = {
      inputSourceMap:false,
      plugins: [
        'some-plugin',
      ],
    };
    expect(ParallelApi.callbacksAreParallelizable(options)).to.eql(true);
  });

  it('function - no', function () {
    var options = {
      inputSourceMap:false,
      plugins: [
        'some-plugin'
      ],
      resolveModuleSource: moduleResolve,
    };
    expect(ParallelApi.callbacksAreParallelizable(options)).to.eql(false);
  });

  it('function with parallelAPI property - yes', function () {
    var someFunc = function() {};
    someFunc.parallelAPI = ['some/file', { some: 'object' }];
    var options = {
      inputSourceMap:false,
      plugins: [
        'some-plugin'
      ],
      keyDontMatter: someFunc,
    };
    expect(ParallelApi.callbacksAreParallelizable(options)).to.eql(true);
  });

  it('parallelAPI set incorrectly - no', function () {
    var someFunc = function() {};
    someFunc.parallelAPI = ['wrong'];
    var options = {
      inputSourceMap:false,
      plugins: [
        'some-plugin'
      ],
      keyDontMatter: someFunc,
    };
    expect(ParallelApi.callbacksAreParallelizable(options)).to.eql(false);
  });
});

describe('transformIsParallelizable()', function() {
  it('no plugins or resolveModule - yes', function () {
    var options = {};
    expect(ParallelApi.transformIsParallelizable(options)).to.eql(true);
  });

  it('plugins are parallelizable - yes', function () {
    var options = {
      plugins: [ 'some-plugin' ],
    };
    expect(ParallelApi.transformIsParallelizable(options)).to.eql(true);
  });

  it('resolveModule is parallelizable - yes', function () {
    var options = {
      resolveModuleSource: moduleResolveParallel
    };
    expect(ParallelApi.transformIsParallelizable(options)).to.eql(true);
  });

  it('both are parallelizable - yes', function () {
    var options = {
      plugins: [ 'some-plugin' ],
      resolveModuleSource: moduleResolveParallel
    };
    expect(ParallelApi.transformIsParallelizable(options)).to.eql(true);
  });

  it('plugins not parallelizable - no', function () {
    var options = {
      plugins: [ function() {} ],
      resolveModuleSource: moduleResolveParallel
    };
    expect(ParallelApi.transformIsParallelizable(options)).to.eql(false);
  });

  it('resolveModuleSource not parallelizable - no', function () {
    var options = {
      plugins: [ 'some-plugin' ],
      resolveModuleSource: function() {},
    };
    expect(ParallelApi.transformIsParallelizable(options)).to.eql(false);
  });
});

describe('concurrency', function() {
  var parallelApiPath = require.resolve('./lib/parallel-api');

  afterEach(function() {
    delete require.cache[parallelApiPath];
    delete process.env.JOBS;
    ParallelApi = require('./lib/parallel-api');
  });

  it('sets jobs automatically using detected cpus', function() {
    expect(ParallelApi.jobs).to.equal(os.cpus().length);
  });

  it('sets jobs using environment variable', function() {
    delete require.cache[parallelApiPath];
    process.env.JOBS = '17';
    ParallelApi = require('./lib/parallel-api');
    expect(ParallelApi.jobs).to.equal(17);
  });
});

describe('large operations', function() {
  var inputTreePath = path.join(os.tmpdir(), 'lots-of-files');
  var expectedContents;

  before(function() {
    babel = makeTestHelper({
      subject: function() {
        return new Babel(arguments[0], arguments[1]);
      },
      fixturePath: inputPath
    });

    if (!fs.existsSync(inputTreePath)) { fs.mkdirSync(inputTreePath); }

    // 100 lines in each file
    var fileContents = Array.apply(null, {length: 100}).map(function(e, i) {
      return 'const x' + i + ' = 0;';
    }).join('\n');
    expectedContents = '"use strict";\n\n' + Array.apply(null, {length: 100}).map(function(e, i) {
      return 'var x' + i + ' = 0;';
    }).join('\n');

    // 2000 files
    var i;
    for (i = 0; i < 2000; i++) {
      fs.writeFileSync(path.join(inputTreePath, 'file-' + i + '.js'), fileContents);
    }
  });
  afterEach(function () {
    return cleanupBuilders();
  });
  after(function() {
    fs.readdirSync(inputTreePath).forEach(function(file) {
      fs.unlinkSync(path.join(inputTreePath, file));
    });
    fs.rmdirSync(inputTreePath);
  });

  it('handles thousands of files', function () {
    this.timeout(5*60*1000); // 5 minutes

    return babel(inputTreePath, {
      inputSourceMap:false,
      sourceMap: false,
      plugins: [
        ['transform-strict-mode-||', fixtureFullPath('transform-strict-mode-parallel'), {}],
        'transform-es2015-block-scoping'
      ]
    }).then(function(results) {
      var outputPath = results.directory;

      fs.readdirSync(outputPath).forEach(function(file) {
        var output = fs.readFileSync(path.join(outputPath, file), 'utf8');
        expect(output).to.eql(expectedContents);
      });
    });
  });
});
