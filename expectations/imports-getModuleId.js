define("testModule", ["exports", "./fixtures-classes"], function (exports, _fixturesClasses) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.FooTwo = void 0;

  var _fixturesClasses2 = _interopRequireDefault(_fixturesClasses);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  class FooTwo extends _fixturesClasses2.default {}

  exports.FooTwo = FooTwo;
});