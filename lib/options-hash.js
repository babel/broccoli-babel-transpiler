'use strict';

const stringify  = require('json-stable-stringify');
const crypto = require('crypto');
const hashForDep = require('hash-for-dep');

module.exports = function optionsHash(options, console) {
  const hash = { plugins: [] };

  for (let key in options) {
    if (key === 'plugins') {
      continue;
    }
    const value = options[key];
    hash[key] = (typeof value === 'function') ? (value + '') : value;
  }

  if (options.plugins) {
    if (!Array.isArray(options.plugins)) {
      throw new TypeError('broccoli-babel-transpiler: babel options.plugins must either be omitted or an array');
    }

    const cacheableItems = options.plugins.slice();

    for (let i = 0; i < cacheableItems.length; i++) {
      const item = cacheableItems[i];
      const type = typeof item;

      if (Array.isArray(item)) {
        item.forEach(part => cacheableItems.push(part));
      } else if (item === null) {
        hash.plugins.push(item);
      } else if (type === 'function' || type === 'object') {
        const augmentsCacheKey = typeof item.cacheKey === 'function';
        const providesBaseDir = typeof item.baseDir === 'function';

        if (augmentsCacheKey) { hash.plugins.push(item.cacheKey()); }
        if (providesBaseDir)  { hash.plugins.push(hashForDep(item.baseDir())); }

        if (!providesBaseDir && !augmentsCacheKey) {
          if (type === 'object') {
            // iterate all keys in the item and push them into the cache
            Object.keys(item).forEach(key => {
              cacheableItems.push(key);
              cacheableItems.push(item[key]);
            });
          } else {
            // prevent caching completely if the plugin doesn't provide baseDir
            // we cannot ensure that we aren't causing invalid caching pain...
            console.warn('broccoli-babel-transpiler is opting out of caching due to a plugin that does not provide a caching strategy: `' + item + '`.');

            // so simply provide a unstable hash value and skip serialization
            return crypto.createHash('md5').update((new Date).getTime() + '|' + Math.random(), 'utf8').digest('hex');
          }
        }
      } else if (type !== 'object') {
        // handle native strings, numbers (which can JSON.stringify properly)
        hash.plugins.push(item);
      } else {
        throw new Error('broccoli-babel-transpiler: unknown babel options value');
      }
    }
  }

  return crypto.createHash('md5').update(stringify(hash), 'utf8').digest('hex');
}
