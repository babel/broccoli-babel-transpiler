'use strict';

const expect = require('chai').expect;
const optionsHash = require('../../lib/options-hash');
const VALID_HASH = /^[a-z0-9]{32}$/;

const PLUGIN_A_PATH = __dirname + '/../fixtures/plugin-a/';
const PLUGIN_B_PATH = __dirname + '/../fixtures/plugin-ab';

describe('optionsHash', function() {
  const warnWasCalledWith = [];
  const console = {
    warn(message) {
      warnWasCalledWith.push(message);
    }
  }

  afterEach(function() {
    warnWasCalledWith.length = 0;
  });

  it('handles simple scenarios', function() {
    expect(optionsHash({ plugins: [] }), console).to.match(VALID_HASH);
    expect(optionsHash({ plugins: [] }), console).to.eql(optionsHash({plugins: []}));

    expect(warnWasCalledWith.length).to.eql(0);
  });

  it('errors of options.plugins is specified but not an array', function() {
    expect(() => optionsHash({ plugins: 1 }), console).to.throw(/options.plugins must either be omitted or an array/);
  });

  describe('functions', function() {
    it('warns if function does not have baseDir but requires baseDir', function() {
      const OPTIONS = { plugins: [ function() {} ] };
      const hash1 = optionsHash(OPTIONS, console);
      expect(hash1).to.match(VALID_HASH);

      expect(warnWasCalledWith.length).to.eql(1);
      expect(warnWasCalledWith[0]).to.match(/is opting out of caching/);

      const hash2 = optionsHash(OPTIONS, console);
      expect(hash2).to.match(VALID_HASH);

      // since we are providing uncachable inputs, the hash keys should not match
      expect(hash1).to.not.eql(hash2);
    });

    it('warns if function does not have baseDir but requires baseDir (deep)', function() {
      const OPTIONS = { plugins: [ 'a', [ function() {} ] ] };
      const hash1 = optionsHash(OPTIONS, console);

      expect(hash1).to.match(VALID_HASH);

      expect(warnWasCalledWith.length).to.eql(1);
      expect(warnWasCalledWith[0]).to.match(/is opting out of caching/);

      const hash2 = optionsHash(OPTIONS, console);
      expect(hash2).to.match(VALID_HASH);

      // since we are providing uncachable inputs, the hash keys should not match
      expect(hash1).to.not.eql(hash2);
    });

    it('handles function \w baseDir()', function() {
      function FUNCTION() { }
      FUNCTION.baseDir = function() { return PLUGIN_A_PATH; };

      function OTHER_FUNCTION() { }
      OTHER_FUNCTION.baseDir = function() { return PLUGIN_A_PATH; };

      function YET_ANOTHER_FUNCTION() { }
      YET_ANOTHER_FUNCTION.baseDir = function() { return PLUGIN_B_PATH; };

      const hash1 = optionsHash({ plugins: [PLUGIN_A_PATH, [FUNCTION]]}, console);

      expect(hash1).to.match(VALID_HASH);

      expect(warnWasCalledWith).to.eql([]);

      const hash2 = optionsHash({ plugins: [PLUGIN_A_PATH, [OTHER_FUNCTION]]}, console);
      expect(hash2).to.match(VALID_HASH);

      expect(hash1).to.eql(hash2);

      const hash3 = optionsHash({ plugins: [PLUGIN_A_PATH, [YET_ANOTHER_FUNCTION]]}, console);
      expect(hash3).to.match(VALID_HASH);
      expect(hash1).to.not.eql(hash3);
    });

    it('handles function \w cacheKey()', function() {
      function FUNCTION() { }
      FUNCTION.cacheKey = function() { return 1; };

      function OTHER_FUNCTION() { }
      OTHER_FUNCTION.cacheKey = function() { return 1; };

      function YET_ANOTHER_FUNCTION() { }
      YET_ANOTHER_FUNCTION.cacheKey = function() { return 2; };

      const hash1 = optionsHash({ plugins: [PLUGIN_A_PATH, [FUNCTION]]}, console);

      expect(hash1).to.match(VALID_HASH);

      expect(warnWasCalledWith).to.eql([]);

      const hash2 = optionsHash({ plugins: [PLUGIN_A_PATH, [OTHER_FUNCTION]]}, console);
      expect(hash2).to.match(VALID_HASH);

      expect(hash1).to.eql(hash2);

      const hash3 = optionsHash({ plugins: [PLUGIN_A_PATH, [YET_ANOTHER_FUNCTION]]}, console);
      expect(hash3).to.match(VALID_HASH);
      expect(hash1).to.not.eql(hash3);
    });

    it('handles function \w cacheKey() & \w baseDir()', function() {
      function FUNCTION() { }
      FUNCTION.cacheKey = function() { return 1; };
      FUNCTION.baseDir = function() { return PLUGIN_A_PATH; };

      function OTHER_FUNCTION() { }
      OTHER_FUNCTION.cacheKey = function() { return 1; }
      OTHER_FUNCTION.baseDir = function() { return PLUGIN_A_PATH; };

      function YET_ANOTHER_FUNCTION() { }
      YET_ANOTHER_FUNCTION.cacheKey = function() { return 1; };
      YET_ANOTHER_FUNCTION.baseDir = function() { return PLUGIN_B_PATH; };

      const hash1 = optionsHash({ plugins: [PLUGIN_A_PATH, [FUNCTION]]}, console);
      expect(hash1).to.match(VALID_HASH);

      expect(warnWasCalledWith).to.eql([]);

      const hash2 = optionsHash({ plugins: [PLUGIN_A_PATH, [OTHER_FUNCTION]]}, console);
      expect(hash2).to.match(VALID_HASH);

      expect(hash1).to.eql(hash2);

      const hash3 = optionsHash({ plugins: [PLUGIN_A_PATH, [YET_ANOTHER_FUNCTION]]}, console);
      expect(hash3).to.match(VALID_HASH);
      expect(hash1).to.not.eql(hash3);
    });
  });

  describe('objects', function() {
    it('handle object, as long as it is serializable', function() {
      const hash1 = optionsHash({ plugins: [{}] }, console);
      expect(hash1).to.match(VALID_HASH);

      expect(warnWasCalledWith.length).to.eql(0);

      const hash2 = optionsHash({ plugins: [{}] }, console);
      expect(hash2).to.match(VALID_HASH);

      // since we are providing uncachable inputs, the hash keys should not match
      expect(hash1).to.eql(hash2);
    });

    it('handle object if they serialize via cacheKey()', function() {
      const hash1 = optionsHash({ plugins: [{ cacheKey() { return 1; }}] }, console);
      expect(hash1).to.match(VALID_HASH);

      expect(warnWasCalledWith.length).to.eql(0);

      const hash2 = optionsHash({ plugins: [{ cacheKey() { return 2; }}] }, console);
      expect(hash2).to.match(VALID_HASH);

      expect(hash1).to.not.eql(hash2);

      const hash3 = optionsHash({ plugins: [{ cacheKey() { return 2; }}] }, console);
      expect(hash2).to.eql(hash3);
    });

    it('handle object if they serialize via baseDir()', function() {
      const hash1 = optionsHash({ plugins: [{ baseDir() { return PLUGIN_A_PATH; }}] }, console);
      expect(hash1).to.match(VALID_HASH);

      expect(warnWasCalledWith.length).to.eql(0);

      const hash2 = optionsHash({ plugins: [{ baseDir() { return PLUGIN_B_PATH; }}] }, console);
      expect(hash2).to.match(VALID_HASH);

      const hash3 = optionsHash({ plugins: [{ baseDir() { return PLUGIN_B_PATH; }}] }, console);
      expect(hash3).to.match(VALID_HASH);

      expect(hash1).to.not.eql(hash2);
      expect(hash2).to.eql(hash3);
    });

    it('warn if object contains non serializable function', function() {
      const OPTIONS = { plugins: [ { hi: function() {} } ] };
      const hash1 = optionsHash(OPTIONS, console);
      expect(hash1).to.match(VALID_HASH);

      expect(warnWasCalledWith.length).to.eql(1);
      expect(warnWasCalledWith[0]).to.match(/is opting out of caching/);

      const hash2 = optionsHash(OPTIONS, console);
      expect(hash2).to.match(VALID_HASH);

      // since we are providing uncachable inputs, the hash keys should not match
      expect(hash1).to.not.eql(hash2);
    });

    it('handles object \w baseDir()', function() {
      const OBJ1 = { baseDir() { return PLUGIN_A_PATH; } };
      const OBJ2 = { baseDir() { return PLUGIN_A_PATH; } };
      const OBJ3 = { baseDir() { return PLUGIN_B_PATH; } };

      const hash1 = optionsHash({ plugins: [PLUGIN_A_PATH, [OBJ1]]}, console);

      expect(hash1).to.match(VALID_HASH);
      expect(warnWasCalledWith).to.eql([]);

      const hash2 = optionsHash({ plugins: [PLUGIN_A_PATH, [OBJ2]]}, console);

      expect(hash2).to.match(VALID_HASH);
      expect(hash1).to.eql(hash2);

      const hash3 = optionsHash({ plugins: [PLUGIN_A_PATH, [OBJ3]]}, console);

      expect(hash3).to.match(VALID_HASH);
      expect(hash1).to.not.eql(hash3);
    });

    it('handles absolute path plugins', function() {
      const Project = require('fixturify-project');
      const project = new Project('rsvp', '3.1.4');

      project.writeSync();

      const hash1 = optionsHash({ plugins: [project.root + '/' + project.name]}, console);
      const hash1b = optionsHash({ plugins: [project.root + '/' + project.name, {}]}, console);
      const hash1c = optionsHash({ plugins: [project.root + '/' + project.name, { one: 2 }]}, console);

      expect(hash1).to.eql(hash1b);
      expect(hash1).to.not.eql(hash1c);

      project.version = '3.1.5';
      project.writeSync();

      const hash2 = optionsHash({ plugins: [project.root + '/' + project.name]}, console);
      expect(hash1).to.eql(hash2);

      require('hash-for-dep')._resetCache();

      project.version = '3.1.6';
      project.writeSync();

      const hash3 = optionsHash({ plugins: [project.root + '/' + project.name]}, console);
      expect(hash2).to.not.eql(hash3);

      project.version = '3.1.7';
      project.writeSync();

      const hash4 = optionsHash({ plugins: [project.root + '/' + project.name]}, console);
      expect(hash3).to.eql(hash4);
    });

    it('handles objects \w cacheKey()', function() {
      function FUNCTION() { }
      const OBJ1 = { cacheKey () { return 1; } }
      const OBJ2 = { cacheKey () { return 1; } }
      const OBJ3 = { cacheKey () { return 2; } }

      const hash1 = optionsHash({ plugins: [PLUGIN_A_PATH, [OBJ1]]}, console);

      expect(hash1).to.match(VALID_HASH);

      expect(warnWasCalledWith).to.eql([]);

      const hash2 = optionsHash({ plugins: [PLUGIN_A_PATH, [OBJ2]]}, console);
      expect(hash2).to.match(VALID_HASH);

      expect(hash1).to.eql(hash2);

      const hash3 = optionsHash({ plugins: [PLUGIN_A_PATH, [OBJ3]]}, console);
      expect(hash3).to.match(VALID_HASH);
      expect(hash1).to.not.eql(hash3);
    });

    it('handles object \w cacheKey() & \w baseDir()', function() {
      const OBJ1 = {
        cacheKey() { return 1; },
        baseDir() { return PLUGIN_A_PATH; }
      };

      const OBJ2 = {
        cacheKey() { return 1; },
        baseDir() { return PLUGIN_A_PATH; }
      };

      const OBJ3 = {
        cacheKey() { return 1; },
        baseDir() { return PLUGIN_B_PATH; }
      };

      const OBJ4 = {
        cacheKey() { return 2; },
        baseDir() { return PLUGIN_B_PATH; }
      };

      const hash1 = optionsHash({ plugins: [PLUGIN_A_PATH, [OBJ1]]}, console);
      expect(hash1).to.match(VALID_HASH);

      expect(warnWasCalledWith).to.eql([]);

      const hash2 = optionsHash({ plugins: [PLUGIN_A_PATH, [OBJ2]]}, console);
      expect(hash2).to.match(VALID_HASH);

      expect(hash1).to.eql(hash2);

      const hash3 = optionsHash({ plugins: [PLUGIN_A_PATH, [OBJ3]]}, console);
      expect(hash3).to.match(VALID_HASH);
      expect(hash1).to.not.eql(hash3);

      const hash4 = optionsHash({ plugins: [PLUGIN_A_PATH, [OBJ4]]}, console);
      expect(hash4).to.match(VALID_HASH);
      expect(hash3).to.not.eql(hash4);
    });
  });
});
