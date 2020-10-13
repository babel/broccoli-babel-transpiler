'use strict';

const fs = require('fs');
const os = require('os');
const expect = require('chai').expect;
const path = require('path');
const Babel = require('../');
const helpers = require('broccoli-test-helpers');
const terminateWorkerPool = require('./utils/terminate-workers');
const makeTestHelper = helpers.makeTestHelper;
const cleanupBuilders = helpers.cleanupBuilders;

const inputPath = path.join(__dirname, 'fixtures');

let babel;

function fixtureFullPath(filename) {
  return path.join(__dirname, 'fixtures', filename);
}

describe('large operations', function() {
  this.timeout(3 * 60 * 1000); // 1 minute

  const inputTreePath = path.join(os.tmpdir(), 'lots-of-files');
  let expectedContents;

  before(function() {
    babel = makeTestHelper({
      subject() {
        return new Babel(arguments[0], arguments[1]);
      },
      fixturePath: inputPath
    });

    if (!fs.existsSync(inputTreePath)) { fs.mkdirSync(inputTreePath); }

    // 100 lines in each file
    let fileContents = Array.apply(null, {length: 100}).map(function(e, i) {
      return 'const x' + i + ' = 0;';
    }).join('\n');
    expectedContents = '"use strict";\n\n' + Array.apply(null, {length: 100}).map(function(e, i) {
      return 'var x' + i + ' = 0;';
    }).join('\n');

    // 2000 files
    for (let i = 0; i < 2000; i++) {
      fs.writeFileSync(path.join(inputTreePath, 'file-' + i + '.js'), fileContents);
    }
  });

  after(function() {
    fs.readdirSync(inputTreePath).forEach(file => {
      fs.unlinkSync(path.join(inputTreePath, file));
    });

    fs.rmdirSync(inputTreePath);
    return terminateWorkerPool();
  });

  it('handles thousands of files', function () {
    return babel(inputTreePath, {
      babel: {
        inputSourceMap:false,
        sourceMap: false,
        plugins: [
          {
            _parallelBabel: {
              requireFile: fixtureFullPath('transform-strict-mode-parallel'),
            }
          },
          '@babel/transform-block-scoping'
        ]
      }
    }).then(results => {
      let outputPath = results.directory;

      fs.readdirSync(outputPath).forEach(file => {
        let output = fs.readFileSync(path.join(outputPath, file), 'utf8');
        expect(output).to.eql(expectedContents);
      });
    });
  });
});
