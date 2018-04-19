define("true-module-fixture", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.bar = _exports.foo = void 0;
  var foo = 5;
  _exports.foo = foo;
  var bar = 6;
  _exports.bar = bar;
});