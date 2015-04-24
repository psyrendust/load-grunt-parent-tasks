/**
 * If Grunt task is loaded as a submodule then create a `grunt-collection` module
 * in your local `node_modules` folder to trick grunt into loading dependencies
 * from a parent folder. This might be necessary if project A contains a Gruntfile.js
 * with dependencies X, Y, and Z, and is loaded as a npm dependency of project B
 * which contains dependencies A, X and Y. In that scenario NPM will de-dupe
 * project A's NPM dependencies when executing `npm install` in project B and will
 * look like this:
 *
 *    B
 *    ├── node_modules
 *    │   ├── A
 *    │   │   ├── Gruntfile.js
 *    │   │   ├── node_modules
 *    │   │   │   └── Z
 *    │   │   └── package.json (has depencencies X,Y,Z)
 *    │   ├── X
 *    │   └── Y
 *    └── package.json (has dependencies A,X,Y)
 *
 * If project A's package.json contains an `install` or `postinstall` script that
 * executes it's Gruntfile.js the Grunt task will throw 2 errors:
 *
 *    Local Npm module "X" not found. Is it installed?
 *    Local Npm module "Y" not found. Is it installed?
 *
 * Project A's Grunt task will not be able to load the de-duped dependencies because
 * they reside in the parents node_modules folder. This can be fixed by dropping in
 * a new module which contains project A's package.json with the addition of a
 * `keywords` property that contains `"gruntcollection"` in it's array.
 *
 *    B
 *    ├── node_modules
 *    │   ├── A
 *    │   │   ├── Gruntfile.js
 *    │   │   ├── node_modules
 *    │   │   │   ├── grunt-collection
 *    │   │   │   │   └── package.json (has dependencies X,Y,Z and 'keywords: ["gruntcollection"]')
 *    │   │   │   └── Z
 *    │   │   └── package.json (has depencencies X,Y,Z)
 *    │   ├── X
 *    │   └── Y
 *    └── package.json (has dependencies A,X,Y)
 *
 * Then at the beginning of your Gruntfile.js you call `grunt.loadNpmTasks('grunt-collection')`.
 * Now Grunt will search up for the current directory to find the modules to load.
 *
 * See:
 *   http://stackoverflow.com/questions/15225865/centralise-node-modules-in-project-with-subproject
 *   https://github.com/gruntjs/grunt/issues/696
 *   http://stackoverflow.com/questions/24854215/grunt-doesnt-look-for-node-modules-in-parent-directory-like-node-does
 */
'use strict';
var path = require('path');

/**
 * Returns the element as an array.
 * @method  toArray
 * @param   {*}  el  An array or any other data type.
 * @return  {Array}  The element as an array.
 */
function toArray(el) {
  return Array.isArray(el) ? el : [el];
}

/**
 * Creates a resolution for loading a package.json file.
 * @method  resolveConfig
 * @param   {String|Object}  config  The location of a package.json or the contents of the package.json.
 * @return  {Object}         The contents of the package.json.
 */
function resolveConfig(config) {
  if (typeof config === 'string') {
    return require(path.resolve(config));
  }
  return config;
}

function loadGruntParentTasks(grunt, options) {
  var log = function() {
    grunt.verbose.writeln(['[loadGruntParentTasks]'.magenta].concat(Array.prototype.slice.call(arguments)).join(' '));
  };

  options = options || {};

  log('process.cwd(): ' + process.cwd().cyan);

  var isRoot = process.cwd().split(path.sep).filter(function(name) {
    return name === 'node_modules';
  }).length === 0;

  log('isRoot: ' + ('' + isRoot).cyan);

  if (!isRoot) {
    var _ = require('lodash');
    var findup = require('findup-sync');
    var globule = require('globule');

    var config = resolveConfig(options.config || findup('package.json'));
    var pattern = toArray(options.pattern || ['grunt-*']);
    var scope = toArray(options.scope || ['dependencies', 'optionalDependencies']);

    var gruntCollection = path.resolve('./node_modules/', (options.module || 'grunt-collection'));
    var gruntCollectionJson = path.join(gruntCollection, 'package.json');

    var newPkg = {};
    var names = [];
    var deps = {};

    pattern.push('!grunt', '!grunt-cli');

    names = scope.reduce(function (result, prop) {
      deps[prop] = {};
      return result.concat(Object.keys(config[prop] || {}));
    }, []);

    // Create a new depenencies object of grunt tasks to load based on the
    // globbing pattern and scope.
    globule.match(pattern, names).map(function(name) {
      scope.forEach(function (prop) {
        if (config[prop] && config[prop][name]) {
          deps[prop][name] = config[prop][name];
        }
      });
    });

    newPkg = _.assign({}, config, {
      keywords: [ 'gruntcollection' ],
      scripts: {}
    }, deps);

    log('Writing: ' + ('' + gruntCollectionJson).cyan);
    grunt.file.mkdir(gruntCollection);
    grunt.file.write(gruntCollectionJson, JSON.stringify(newPkg, null, 2));
    log('loadNpmTasks: ' + 'grunt-collection'.cyan);
    grunt.loadNpmTasks('grunt-collection');
  }
}

module.exports = loadGruntParentTasks;
