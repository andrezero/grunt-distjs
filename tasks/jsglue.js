'use strict';

var util = require('util');
var path = require('path');
var _ = require('lodash');

module.exports = function (grunt) {

    grunt.registerMultiTask('jsglue', 'Streamline configuration and execution of dist js related tasks.', function () {

        var task = this;

        // default options
        var opts = this.options({
            concat: {},
            copy: {},
            uglify: {
                mangle: true,
                compress: true,
                beautify: false,
                sourceMap: false,
                preserveComments: false
            },
            keepNoMins: false,
            noMinsBanner: null
        });

        // destination files of concat/copy are then taken by uglify
        // if file is not to be minified or non-minified files are to be kept destination is .js
        // otherwise concat/copy destination is immediately named .min.js
        var destFiles = [];
        var dest;
        var config;
        var target = 'jsglue_' + task.target;
        var srcList;

        // concat OR ...
        if (opts.concat) {
            grunt.verbose.writeln('+ concat:' + target + ':');

            var concatFile;
            this.files.forEach(function (file) {

                srcList = [];
                file.src.forEach(function (src) {
                    srcList.push(unixifyPath(path.join(file.orig.cwd || '', src)));
                });

                concatFile = {
                    src: srcList,
                    dest: normalizeDest(opts, null, file.dest, file.orig.flatten)
                };
                destFiles.push(concatFile);

                grunt.verbose.writeln('  + [' + concatFile.src + ' -> ' + concatFile.dest + ']');
            });

            // task options, including specific concat options for this target
            // Grunt will apply any 'concat' defaults if a'concat.options' exists in config
            config = {
                files: destFiles,
                options: opts.concat
            };

            // queue the concat task with the custom 'jsglue_xxx' target
            grunt.config.set('concat.' + target, config);
            grunt.task.run('concat:' + target);
        }

        // ... OR copy ...
        else {
            grunt.verbose.writeln('+ copy:' + target + ':');

            // generate a src -> dest map per file being copied
            var srcPath;
            var copyFile;
            this.files.forEach(function (file) {

                // srcList is collected just for vebose output
                srcList = [];
                file.src.forEach(function (src) {

                    srcPath = unixifyPath(path.join(file.orig.cwd || '', src));
                    srcList.push(srcPath);

                    copyFile = {
                        src: srcPath,
                        dest: normalizeDest(opts, src, file.dest, file.orig.flatten)
                    };
                    destFiles.push(copyFile);
                });

                grunt.verbose.writeln('  + [' + srcList + ' -> ' + file.dest + ']');
            });

            // task options, including specific copy options for this target
            // Grunt will apply any 'copy' defaults if a'copy.options' exists in config
            config = {
                files: destFiles,
                options: opts.copy
            };

            // queue the copy task with the custom 'jsglue_xxx' target
            grunt.config.set('copy.' + target, config);
            grunt.task.run('copy:' + target);
        }

        // ... THEN add banner to non-minified files

        if (opts.noMinsBanner) {

        }

        // ... and THEN uglify
        if (opts.uglify) {
            grunt.verbose.writeln('+ uglify:' + target + ':');

            // generate a [src, src, src, src ...] -> dest map per file being generated
            var uglifyFiles = [];
            var uglifyFile;
            destFiles.forEach(function (file) {

                uglifyFile = {
                    src: file.dest,
                    dest: file.dest.replace(/.js$/, '.min.js')
                };
                uglifyFiles.push(uglifyFile);

                grunt.verbose.writeln('  + [' + uglifyFile.src + ' -> ' + uglifyFile.dest + ']');
            });

            // task options, including specific uglify options for this target
            // Grunt will apply any 'uglify' defaults if a'uglify.options' exists in config
            config = {
                files: uglifyFiles,
                options: opts.uglify
            };

            // queue the uglify task with the custom 'jsglue_xxx' target
            grunt.config.set('uglify.' + target, config);
            grunt.task.run('uglify:' + target);
        }

        grunt.verbose.ok();
    });

    var endsWith = function (str, suffix) {
        return str.indexOf(suffix, str.length - suffix.length) !== -1;
    };

    var isDir = function (dest) {
        return (endsWith(dest, '/'));
    };

    var fileNameOf = function (dest) {
        var matches = dest.match(/\/([^/]*)$/);
        return matches ? matches[1] : dest;
    };

    var hasExtension = function (dest) {
        return (endsWith(dest, '.js'));
    };

    var hasMinExtension = function (dest) {
        return (endsWith(dest, '.min.js'));
    };

    var unixifyPath = function (filepath) {
        if (process.platform === 'win32') {
            return filepath.replace(/\\/g, '/');
        } else {
            return filepath;
        }
    };

    var normalizeDest = function (opts, src, dest, flatten) {
        if (!isDir(dest) && !opts.concat) {
            grunt.fail.warn('Cannot copy multiple file into "' + dest + '" Destination must be target directory ending in "/".');
        } else if (isDir(dest) && opts.concat) {
            grunt.fail.warn('Cannot copy concat file into "' + dest + '" Destination must be target file name (with optional .js extension).');
        } else if (isDir(dest)) {
            dest = dest + (flatten ? fileNameOf(src) : src);
        }
        if (!hasExtension(dest)) {
            dest += (!opts.uglify || opts.keepNoMins) ? '.js' : '.min.js';
        } else if (hasMinExtension(dest) && (!opts.uglify || opts.keepNoMins)) {
            dest = dest.replace(/.min.js$/, '.js');
        } else if (opts.uglify && !opts.keepNoMins) {
            dest = dest.replace(/.js$/, '.min.js');
        }
        return dest;
    };

};

