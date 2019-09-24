import * as path from 'path';

interface PassedOptions {
    config?: {} | string;
    pattern?: string | string[];
    scope?: string | string[];
    module?: string;
    alwaysCreate?: boolean;
}

interface ResolvedOptions {
    config: {};
    pattern: string[];
    scope: string[];
    module: string;
    alwaysCreate: boolean;
}

/**
 * Returns the element as an array.
 */
function toArray(el: string | string[]): string[] {
    return Array.isArray(el) ? el : [el];
}

/**
 * Creates a resolution for loading a package.json file.
 */
function resolveConfig(config: {} | string): {} {
    if (typeof config === 'string') {
        return require(path.resolve(config));
    }
    return config;
}

/**
 * Sets default options for any options that were not passed
 */
function defaultOptions(options: PassedOptions): ResolvedOptions {
    const findup = require('findup-sync');
    return {
        alwaysCreate: !!options.alwaysCreate,
        config: resolveConfig(options.config || findup('package.json')),
        module: options.module || 'grunt-collection',
        pattern: toArray(options.pattern || ['grunt-*']),
        scope: toArray(options.scope || ['dependencies', 'optionalDependencies'])
    };
}

function loadGruntParentTasks(grunt: IGrunt, options: PassedOptions = {}) {
    const log = (...args: any[]) => {
        grunt.log.verbose.writeln(['[loadGruntParentTasks]'.magenta].concat(
            Array.prototype.slice.call(args)).join(' '));
    };

    log('process.cwd(): ' + process.cwd().cyan);

    const isRoot = process.cwd().split(path.sep).filter((name) => name === 'node_modules').length === 0;

    log('isRoot: ' + ('' + isRoot).cyan);

    if (!isRoot || options.alwaysCreate) {
        const globule = require('globule');
        const { config, pattern, scope, module: optModule } = defaultOptions(options);

        const gruntCollection = path.resolve('./node_modules/', optModule);
        const gruntCollectionJson = path.join(gruntCollection, 'package.json');

        const deps = { dependencies: {} };

        pattern.push('!grunt', '!grunt-cli');

        const names = scope.reduce((result: string[], prop) => {
            deps[prop] = {};
            return result.concat(Object.keys(config[prop] || {}));
        }, [] as string[]);

        // Create a new dependencies object of grunt tasks to load based on the
        // globbing pattern and scope.
        globule.match(pattern, names).map((name: string) => {
            scope.forEach((prop) => {
                if (config[prop] && config[prop][name]) {
                    deps.dependencies[name] = config[prop][name];
                }
            });
        });

        const newPkg = Object.assign({}, config, {
            keywords: ['gruntcollection'],
            scripts: {},
        }, deps);

        log('Writing: ' + ('' + gruntCollectionJson).cyan);
        grunt.file.mkdir(gruntCollection);
        grunt.file.write(gruntCollectionJson, JSON.stringify(newPkg, null, 2));
        log('loadNpmTasks: ' + 'grunt-collection'.cyan);
        grunt.loadNpmTasks('grunt-collection');
    }
}

module.exports = loadGruntParentTasks;
