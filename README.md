# load-grunt-parent-tasks

> Loads de-duped grunt tasks from parent or sibling modules, or for hoisted monorepos.

## TL;DR

load-grunt-parent-tasks is a Grunt library that allows you to load all of your
Grunt tasks even if they are in a parent folder. This library was heavily inspired
by this StackOverflow post: ["Centralise Node Modules In Project With Subproject"](http://stackoverflow.com/questions/15225865/centralise-node-modules-in-project-with-subproject), and 
and utilizes the `gruntcollection` feature of `grunt.loadNpmTasks`.

## Description

If Grunt task is loaded as a submodule then create a `grunt-collection` module
in your local `node_modules` folder to trick grunt into loading dependencies
from a parent folder. This might be necessary if project A contains a Gruntfile.js
with dependencies X, Y, and Z, and is loaded as a npm dependency of project B
which contains dependencies A, X and Y. In that scenario Npm will de-dupe
project A's Npm dependencies when executing `npm install` in project B and will
look like this:

    B
    ├── node_modules
    │   ├── A
    │   │   ├── Gruntfile.js
    │   │   ├── node_modules
    │   │   │   └── Z
    │   │   └── package.json (has dependencies X,Y,Z)
    │   ├── X
    │   └── Y
    └── package.json (has dependencies A,X,Y)

If project A's package.json contains an `install` or `postinstall` script that
executes it's Gruntfile.js the Grunt task will throw 2 errors:

    Local Npm module "X" not found. Is it installed?
    Local Npm module "Y" not found. Is it installed?

Project A's Grunt task will not be able to load the de-duped dependencies because
they reside in the parents node_modules folder. This can be fixed by dropping in
a new module which contains project A's package.json with the addition of a
`keywords` property that contains `"gruntcollection"` in it's array.

    B
    ├── node_modules
    │   ├── A
    │   │   ├── Gruntfile.js
    │   │   ├── node_modules
    │   │   │   ├── grunt-collection
    │   │   │   │   └── package.json (has dependencies X,Y,Z and 'keywords: ["gruntcollection"]')
    │   │   │   └── Z
    │   │   └── package.json (has dependencies X,Y,Z)
    │   ├── X
    │   └── Y
    └── package.json (has dependencies A,X,Y)

Then at the beginning of your Gruntfile.js you call `grunt.loadNpmTasks('grunt-collection')`.
Now Grunt will search up for the current directory to find the modules to load.

## Features

- Checks if the main Grunt task is a submodule of another project.
- Creates a `grunt-collection` module in your local `node_modules` folder.
- Creates a `grunt-collection/package.json` that is a mirror of your projects `package.json` file defined by `options.config`.
- Filters out npm modules to load using globbing patterns defined in `options.pattern`.
- Filters out which dependencies key to load from defined by `options.scope`.

##Installation

```bash
npm install --save load-grunt-parent-tasks
```

##Example

Basic Gruntfile.js
```javascript
module.exports = function(grunt) {

  require('load-grunt-parent-tasks')(grunt);

};
```

Creates the following:

    A
    ├── Gruntfile.js
    ├── node_modules
    │   └── grunt-collection
    │       └── package.json
    └── package.json

Gruntfile.js with options
```javascript
module.exports = function(grunt) {

  require('load-grunt-parent-tasks')(grunt, {
    config: 'package.json',
    pattern: 'grunt-*',
    scope: 'dependencies',
    module: 'abc-def'
  });

};

// Can also be written as:
module.exports = function(grunt) {

  require('load-grunt-parent-tasks')(grunt, {
    config: require('package.json'),
    pattern: ['grunt-*'],
    scope: ['dependencies'],
    module: 'abc-def'
  });

};
```

Creates the following:

    A
    ├── Gruntfile.js
    ├── node_modules
    │   └── abc-def
    │       └── package.json
    └── package.json

## Options

### config

Type: `String`, `Object`  
Default: Path to nearest package.json

### pattern

Type: `String`, `Array`  
Default: `'grunt-*'` ([globbing pattern](https://github.com/isaacs/minimatch))

### scope

Type: `String`, `Array`  
Default: `['dependencies', 'optionalDependencies']`

### module

Type: `String`  
Default: `'grunt-collection'`

The `module` option can be changed in case `grunt-collection` ever conflicts with any other package name.

### alwaysCreate

Type: `boolean`  
Default: `'false'`

Will create the fake package in node_modules even if the cwd is root (this should be set if
you want to hoist grunt tasks in a monorepo)

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## License

[MIT](http://psyrendust.mit-license.org/2014/license.html) © [Larry Gordon](https://github.com/psyrendust)
