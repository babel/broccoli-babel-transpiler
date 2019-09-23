'use strict';

const expect = require('chai').expect;


describe('is-absolute-path-plugin', function() {
  const isAbsolutePathPlugin = require('../../lib/options-hash').isAbsolutePathPlugin;
  it('works', function() {
    expect(isAbsolutePathPlugin()).to.eql(false);
    expect(isAbsolutePathPlugin(undefined)).to.eql(false);
    expect(isAbsolutePathPlugin(null)).to.eql(false);
    expect(isAbsolutePathPlugin({})).to.eql(false);
    expect(isAbsolutePathPlugin([])).to.eql(false);

    expect(isAbsolutePathPlugin('/my/plugin')).to.eql(true);
    expect(isAbsolutePathPlugin(['/my/plugin'])).to.eql(true);
    expect(isAbsolutePathPlugin(['/my/plugin', {}, {}])).to.eql(true);
  });
});

describe('modulePath', function() {
  const modulePath = require('../../lib/options-hash').modulePath;

  it('works', function() {
    expect(modulePath(__dirname + '/../fixtures/plugin-a')).to.eql(__dirname + '/../fixtures/plugin-a');
    expect(modulePath(__dirname + '/../fixtures/plugin-a/index.js')).to.eql(__dirname + '/../fixtures/plugin-a');
    expect(() => modulePath('/')).to.throw(/Could not infer module from: `/);
  })
});
