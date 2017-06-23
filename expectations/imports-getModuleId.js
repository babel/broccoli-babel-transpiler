define('testModule', ['exports', './fixtures-classes'], function (exports, _fixturesClasses) {
  'use strict';

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  var _Foo = _interopRequireDefault(_fixturesClasses);

  var ok = _Foo['default'].bar();
});