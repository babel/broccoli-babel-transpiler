define("testModule", ["exports", "./fixtures-classes"], function (_exports, _fixturesClasses) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.FooTwo = void 0;
  _fixturesClasses = _interopRequireDefault(_fixturesClasses);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  class FooTwo extends _fixturesClasses.default {}
  _exports.FooTwo = FooTwo;
});