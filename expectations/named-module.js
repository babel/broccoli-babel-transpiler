"use strict";

define("foo", ["exports"], function (exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  var foo = 5;
  var bar = 6;
  exports.foo = foo;
  exports.bar = bar;
});