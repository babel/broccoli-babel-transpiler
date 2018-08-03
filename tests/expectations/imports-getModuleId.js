define("testModule", ["exports", "./fixtures-classes"], function (_exports, _fixturesClasses) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.FooTwo = void 0;
  _fixturesClasses = _interopRequireDefault(_fixturesClasses);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

  class FooTwo extends _fixturesClasses.default {}

  _exports.FooTwo = FooTwo;
});