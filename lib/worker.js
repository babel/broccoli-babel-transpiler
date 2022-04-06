'use strict';

const transpiler = require('@babel/core');
const workerpool = require('workerpool');
const Promise = require('rsvp').Promise;
const ParallelApi = require('./parallel-api');

// transpile the input string, using the input options
function transform(string, options) {
  return Promise.resolve().then(() => {
    try {
      let result = transpiler.transform(string, ParallelApi.deserialize(options));

      return {
        code: result.code,
        metadata: result.metadata
      };
    } catch (error) {
      return {
        error: error.message,
        stack: error.stack,
      };
    }
  });
}

// create worker and register public functions
workerpool.worker({
  transform: transform
});
