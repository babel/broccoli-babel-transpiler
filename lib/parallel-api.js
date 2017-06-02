'use strict';

module.exports = {
  pluginCanBeParallelized: function(plugin) {
    return typeof plugin === 'string' ||
           (Object.prototype.toString.call(plugin) === '[object Array]' &&
            plugin.length === 3 &&
            typeof (plugin[0]) === 'string' &&
            typeof (plugin[1]) === 'string');
  },

  pluginsAreParallelizable: function(plugins) {
    return plugins === undefined || plugins.every(this.pluginCanBeParallelized);
  },

  resolveModuleIsParallelizable: function(resolveModule) {
    return resolveModule === undefined ||
           (Object.prototype.toString.call(resolveModule) === '[object Array]' &&
            resolveModule.length === 3 &&
            typeof (resolveModule[0]) === 'string' &&
            typeof (resolveModule[1]) === 'string');
  },

  transformIsParallelizable: function(options) {
    return this.pluginsAreParallelizable(options.plugins) &&
           this.resolveModuleIsParallelizable(options.resolveModuleSource);
  },
};
