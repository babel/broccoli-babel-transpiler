function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

let Bar = function Bar() {
  _classCallCheck(this, Bar);
};

export let Foo = function (_Bar) {
  _inherits(Foo, _Bar);

  function Foo() {
    _classCallCheck(this, Foo);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(Foo).apply(this, arguments));
  }

  return Foo;
}(Bar);