'use strict';

var fs = require('fs');
var os = require('os');
var expect = require('chai').expect;
var path = require('path');
var Babel = require('./index');
var helpers = require('broccoli-test-helpers');
var makeTestHelper = helpers.makeTestHelper;
var cleanupBuilders = helpers.cleanupBuilders;

var inputPath = path.join(__dirname, 'fixtures');

var babel;

function fixtureFullPath(filename) {
  return path.join(__dirname, 'fixtures', filename);
}


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
        {
          _parallelBabel: {
            requireFile: fixtureFullPath('transform-strict-mode-parallel'),
          }
        },
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
