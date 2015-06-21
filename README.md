# broccoli-babel-transpiler

[![Build Status](https://travis-ci.org/babel/broccoli-babel-transpiler.svg?branch=master)](https://travis-ci.org/babel/broccoli-babel-transpiler)

A [Broccoli](https://github.com/broccolijs/broccoli) plugin which
transpiles ES6 to readable ES5 by using [babel](https://github.com/babel/babel).

## How to install?

```sh
$ npm install broccoli-babel-transpiler --save-dev
```

## How to use?

In your `Brocfile.js`:

```js
var esTranspiler = require('broccoli-babel-transpiler');
var scriptTree = esTranspiler(inputTree, options);
```

You can find [options](https://babeljs.io/docs/usage/options) at babel's
github repo.

## About source map

Currently this plugin only supports inline source map. If you need
separate source map feature, you're welcome to submit a pull request.

## Advanced usage

`filterExtensions` is an option to limit (or expand) the set of file extensions that will be transformed.

The default `filterExtension` is `js`

```js
var esTranspiler = require('broccoli-babel-transpiler');
var scriptTree = esTranspiler(inputTree, {
    filterExtensions:['js', 'es6'] // babelize both .js and .es6 files
});
```

`exportModuleMetadata` is an option that can be used to write a JSON file to the output tree that gives you metadata about the tree's imports and exports.
