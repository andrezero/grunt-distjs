
# grunt-distjs

> Streamline configuration and execution of dist js related tasks.


## Getting Started

This plugin requires Grunt `~0.4.0`.

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the
[Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a
[Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins.

1. Install the plugin with this command:

```shell
npm install grunt-distjs --save-dev
```

2. Add this line to your project's `Gruntfile.js` gruntfile:

```javascript
grunt.loadNpmTasks('grunt-distjs');
```

## The "distjs" task

_Run this task with the `grunt distjs` command._

Task targets, files and options may be specified according to the grunt
[Configuring tasks](http://gruntjs.com/configuring-tasks) guide.


### Overview

This is a grunt multi-task to coordinate the tasks involved in generating javascript deliverables, streamlining the
configuration of several tasks in a single, consolidated, and deliverable focused task.

Currently, it makes use of:
- [grunt-contrib-copy](https://github.com/gruntjs/grunt-contrib-copy),
- [grunt-contrib-concat](https://github.com/gruntjs/grunt-contrib-concat)
- [grunt-contrib-uglify](https://github.com/gruntjs/grunt-contrib-uglify)

See the roadmap below for what's cooking for later.


### Configration

Inside your `Gruntfile.js` file add a section called `distjs`. This section specifies the targets for the `distjs` task
and the options you want to pass to each target.

Here's an example configuration:

```javascript
config = {

    dist_js: {

        options: {
            path: 'dist/',
            concat: true,
            uglify: true,
            keepPretty: false
        },

        main: {
            src: 'src/core/**/*.js',
            dest: 'mylib',
            keepPretty: true
        },

        foo: {
            src: 'src/plugins/foo/**/*.js',
            dest: 'plugins/foo'
        },

        bar: {
            src: 'src/plugins/bar/**/*.js',
            dest: 'plugins/bar'
        },

        baz: {
            src: 'src/modules/**/*.js',
            concat: false
            cwd: 'src/modules/',
            dest: 'mods/'
            flatten: false
        }
    }
}
```
In the `main` target we concatenate and uglify our main deliverables and we want to keep the unminified version.

The `foo` and `bar` targets use all the defaults, take some part of our source-code and generate concatenated and
uglified files in the given destinations.

The last target `baz` overrides the 'concat' option in order to copy over a bunch of files to `mods/`, ignoring the
`src/modules` part of the original paths, but keep the tree-structure under it. It then applies the defaults to
generate a `.min` of each file and discard the unminified versions.

Assuming all source files exist, and a deep directory tree exists in `src/modules`, then the above configuration will
generate the following deliverables.

```
./dist
    /mylib.js
    /mylib.min.js
    /plugins
        /foo.min.js
        /bar.min.js
    /mods
        /module1
            /subdir/
                /somefile.min.js
                /anotherfile.min.js
        /...
```


### Gotchas

The `dest` property must be a string. If it is an array, Grunt will fail when attempting to write the files.

When `concat` is turned off, the original filenames will be preserved and `dest` property works as a prefix for all
generated files. See `dest` below for details.


### Options

_Note: Options declared in a target will always _OVERRIDE_ the ones declared in the `options` property._


#### options.src
Type: `String|Array`
Default value: `null`

List of `css` and `js` files to link to. You can use the powerful
[grunt files](http://gruntjs.com/configuring-tasks#files) here, including glob patterns and template substitution.

```javascript
src: [
  '<%= html2js.main.dest %>',
  'src/**/*.js'
]
```

#### options.concat
Type: `Object|Boolean`
Default value: `true`

Whether to concatenate the source files using [concat](https://github.com/gruntjs/grunt-contrib-concat).

If `options.concat` is set to `true`, then matching files will be concatenated to the destination, using the
[concat](https://github.com/gruntjs/grunt-contrib-concat) task defaults.

If you want to set the concat options (separators, banners, footers, ect...) you can set `options.concat` to an object
with the copy specific parameters:

```javascript
config = {

    dist_js: {

        options: {
            path: 'dist/',
            concat: {
                banner: '/* HELLO! */',
            },
            uglify: true,
            keepPretty: false
        },

        main: {
            src: 'src/core/**/*.js',
            dest: 'mylib'
        }
    }
}
```


#### options.copy
Type: `Object`
Default value: `.`

If `options.concat` is set to false, then the matching source files will be copied over to destination using the
[copy](https://github.com/gruntjs/grunt-contrib-copy) task, optionally perserving all or part of the source directory
structure.

Set `options.copy` to an object to pass configuration to the copy task:

```javascript
config = {

    dist_js: {

        options: {
            path: 'dist/',
            uglify: true,
            keepPretty: false
        },

        main: {
            src: 'src/core/**/*.js',
            dest: 'mylib',
            concat: false,
            copy: {
                timestamp: true
            }
        }
    }
}
```

Aditionally, the following `options.copy.cwd` and `options.copy.flatten` can be added to the `copy` configuration object
to control the how the source directory structure translates to the destination.
structure.

```javascript
copy: {
    flatten: false,
    cwd: 'src/core/'
}
```

#### options.copy.cwd

This is the Grunt [cwd](http://gruntjs.com/configuring-tasks#building-the-files-object-dynamically) option for the
underlying [copy](https://github.com/gruntjs/grunt-contrib-copy) task and it is only relevant when `options.concat`
is set to `false`.

When copying files over to the your destination directory, you sometimes want to lay them out according to the original
file-structure, but you typically want to preserve only a part of the orginal path.

Imagine `options.src` was set to `src/modules/**/*.js` and it matches the 2 following files:

- `src/modules/foo/foo.js`
- `src/modules/bar/bar.js`

The below outcome is probably _NOT_ what you are after.

```
copy.cwd:  . (default)
src:       src/modules/**/*.js
flatten:   false
concat:    false

  path   dest      src                     > non-minified
--------------------------------------------------------------------------------
  dist/  modules/  src/modules/foo/foo.js  > dist/modules/src/modules/foo/foo.js
                   src/modules/bar/bar.js  > dist/modules/src/modules/bar/bar.js
```

The `cwd` option tells Grunt to execute the [copy](https://github.com/gruntjs/grunt-contrib-copy) _from within a
certain directory_ therefore making all paths relative to that directory, i.e., igoring that part of the original path.

```
copy.cwd:  src/modules
src:       **/*.js
flatten:   false
concat:    false

  path   dest      src                     > non-minified
--------------------------------------------------------------------------------
  dist/  modules/  src/modules/foo/foo.js  > dist/modules/foo/foo.js
                   src/modules/bar/bar.js  > dist/modules/bar/bar.js
```

_NOTE: the `options.src` needs to be updated accordingly, it should be relative to the value of `cwd`._


##### options.copy.flatten
Type: `Boolean`
Default value: `true`

This is the Grunt [flatten](http://gruntjs.com/configuring-tasks#building-the-files-object-dynamically) option for the
underlying [copy](https://github.com/gruntjs/grunt-contrib-copy) task and it is only relevant when `options.concat`
is set to `false`.

Following the above example, if `options.copy.flatten` is set to true, then the all the matches files will be copied
into `path/dest` regardless of their original path. In this case, `options.copy.cwd` is now only relevant in the sense that
it can restrict which files should be copied to a certain source directory.


```
cwd:     src/modules
src:     **/*.js
flatten: false
concat:  false

  path   dest      src                     > non-minified
--------------------------------------------------------------------------------
  dist/  modules/  src/modules/foo/foo.js  > dist/modules/foo.js
                   src/modules/bar/bar.js  > dist/modules/bar.js
```


#### options.uglify
Type: `Object|Boolean`
Default value: `true`

Whether to uglify the result of the concat/copy step.

If you want to set the uglify options (compress, mangle, beautify, ect...) you can set `options.uglify` to an object
with the copy specific parameters:

```javascript
config = {

    dist_js: {

        options: {
            path: 'dist/',
            uglify: {
                compress: false,
                beautify: true
            }
            uglify: true,
            keepPretty: false
        },

        main: {
            src: 'src/core/**/*.js',
            dest: 'mylib'
        }
    }
}
```


#### options.keepPretty
Type: `Boolean`
Default value: `false`

Whether or not to not keep the un-minified version.


#### options.path
Type: `String`
Default value: `'dist/'`

The base path to write all the files to.

_Warning: Should end with a trailing `/`, othwerwise you will get some funny results in your project root directory._


#### options.dest
Type: `String`
Default value: `null`

Filename _OR_ prefix of generated files, appended to `options.path`.

If `concat` is set to `true` then `dest` is used as single destination file name for the
[concat](https://github.com/gruntjs/grunt-contrib-concat) task(s). In this case, `dest` _SHOULD NOT_ end with a
trailing `/` or otherwise it will generate `./dist/destination-path/.js` and/or `/dist/destination-path/.min.js` files.

```
concat: true

  path     dest          > non-minified          minified
--------------------------------------------------------------------------------
  dist/    foo           > dist/foo.js           dist/foo.min.js
  dist/    plugins/foo   > dist/plugins/foo.js   dist/plugins/foo.min.js
  dist/                  > dist/.js              dist/.min.js
  dist/    bar/          > dist/bar/.js          dist/bar/.min.js
```

File extension is optional but note that the task always assumes the end result to be `.js`. So if your `dest` ends with
something other than `.js`, it will still be appended to the generated file name.

```
concat: true

  path     dest          > non-minified           minified
--------------------------------------------------------------------------------
  dist/    foo           > dist/foo.js            dist/foo.min.js
  dist/    foo.js        > dist/foo.js            dist/foo.min.js
  dist/    foo.bar       > dist/foo.bar.js        dist/foo.bar.min.js
```

If `concat` is set to `false` then one or more source files will be copied with
[copy](https://github.com/gruntjs/grunt-contrib-copy) instead of concat and `dest` will be used as a prefix applied to
the original `path/to/file.name.js` being copied.

In this case `dest` _SHOULD_ typically end with a trailing '/', but it can otherrwise be used to achieve interesting
results.

In the example below, assuming that `options.src` was set to `src/modules/**.*` and it matched 2 files (`.../foo.js` and
`.../bar.js`) and assuming we have `options.copy.flatten` set to `true` to flatten the directory structure (see above)
then we can get the following results:

```
flatten: true
concat:  false

  path     dest       src            >  non-minified
--------------------------------------------------------------------------------
  dist/    modules/   .../foo.js     >  dist/modules/foo.js
                      .../bar.js     >  dist/modules/foo.js
  dist/    module-    .../foo.js     >  dist/module-bar.js
                      .../bar.js     >  dist/module-bar.js
```

---


## Roadmap

* add ability to rename multiple functions via callback fn().
* apply a filter fn() to the content of all files


## Credits and Acknowlegdments

All credits go to the [ngbp](https://github.com/ngbp/ngbp) project for seeding an `index` task in the boilerplate.
