'use strict';

var util = require('util');
var path = require('path');
var _ = require('lodash');

// waiting for lodash 3.0
var nativeMin = Math.min;
_.endsWith = function (string, target, position) {
    string = string == null ? '' : String(string);
    target = String(target);

    var length = string.length;
    position = (typeof position === 'undefined' ? length : nativeMin(position < 0 ? 0 : (+position || 0), length)) - target.length;
    return position >= 0 && string.indexOf(target, position) === position;
};

module.exports = function (grunt) {

    grunt.registerMultiTask('jsglue', 'Streamline configuration and execution of dist js related tasks.', function () {

        var opts = makeOptions(this);

        // used to queue other tasks with uniq targets
        var target = this.target;
        var uniqTarget;
        var queuedTasks = [];
        var destFiles = [];
        var dest;
        var taskConfig;
        var srcList;

        // if file is not to be minified (OR non-minified files are to be kept) then concat/copy destination is .js
        // otherwise concat/copy destination is immediately set to .min.js

        // -- CONCAT or COPY

        if (opts.concat) {
            uniqTarget = makeUniqTarget(target);
            grunt.verbose.writeln('+ concat:' + uniqTarget + ':');

            // generate a src -> dest map per concat destination
            var concatDest;
            this.files.forEach(function (file) {

                srcList = [];
                file.src.forEach(function (src) {
                    src = path.join(file.orig.cwd || '', src);
                    srcList.push(src);
                });

                // validate destination is a file name (not a directory!)
                validateConcatDest(file.dest);

                // add/translate the extension
                // if we don't want to keep the non-minified files, files are concatenated straight to .min.js
                concatDest = opts.keepNoMins ? addExtension(file.dest, '.js', '.min.js') : addExtension(file.dest, '.min.js', '.js');

                destFiles.push({
                    src: srcList,
                    dest: concatDest
                });

                grunt.verbose.writeln('  + [' + srcList + ' -> ' + concatDest + ']');
            });

            // task options, including specific concat options for this target
            taskConfig = {
                files: destFiles,
                options: opts.concat
            };

            // queue the concat task with a uniq target name
            queuedTasks.push(queueTask('concat', uniqTarget, taskConfig));
        } else {
            uniqTarget = makeUniqTarget(target);
            grunt.verbose.writeln('+ copy:' + uniqTarget + ':');

            // generate a src -> dest map per file being copied
            var copyDest;
            this.files.forEach(function (file) {

                // srcList is collected just for vebose output
                file.src.forEach(function (src) {

                    // validate destination is a directory name (not a file name!)
                    validateCopyDest(file.dest);

                    // add the name of the file being copied (if flatten, ignore the path on src file name))
                    // add/translate the extension
                    // if we don't want to keep the non-minified files, files are copied straight to .min.js
                    copyDest = file.dest + (file.orig.flatten ? fileNameOf(src) : src);
                    copyDest = opts.keepNoMins ? addExtension(copyDest, '.js', '.min.js') : addExtension(concatDest, '.min.js', '.js');

                    // resolve original filename to avoid passing cwd again to copy
                    src = path.join(file.orig.cwd || '', src);

                    destFiles.push({
                        src: src,
                        dest: copyDest
                    });

                    grunt.verbose.writeln('  + [' + src + ' -> ' + copyDest + ']');
                });
            });

            taskConfig = {
                files: destFiles,
                options: opts.copy
            };

            // queue the copy task with a uniq target name
            queuedTasks.push(queueTask('copy', uniqTarget, taskConfig));
        }

        // -- UGLIFY --

        if (opts.minify) {
            uniqTarget = makeUniqTarget(target);
            grunt.verbose.writeln('+ uglify:' + uniqTarget + ':');

            // generate a [src, src, src, src ...] -> dest map per file being generated
            var uglifyFiles = [];
            var uglifyDest;
            destFiles.forEach(function (file) {

                var extensionToReplace = opts.keepNoMins ? '.js' : '.min.js';
                uglifyDest = addExtension(file.dest, '.min.js', extensionToReplace);

                uglifyFiles.push({
                    src: file.dest,
                    dest: uglifyDest
                });

                grunt.verbose.writeln('  + [' + file.dest + ' -> ' + uglifyDest + ']');
            });

            taskConfig = {
                files: uglifyFiles,
                options: opts.uglify
            };

            // queue the uglify task with a uniq target name
            queuedTasks.push(queueTask('uglify', uniqTarget, taskConfig));
        }

        grunt.log.ok('queued tasks: ' + grunt.log.wordlist(queuedTasks));
    });

    /**
     * @param {object} task instance
     */
    var makeOptions = function (task) {

        // -- default options

        // make sure underlying task defaults are not applied
        var defaults = {
            concat: {
                separator: grunt.util.linefeed,
                footer: '',
                stripBanners: false,
                process: false,
                sourceMap: false,
                sourceMapName: undefined,
                sourceMapStyle: 'embed'
            },
            copy: {
                process: false,
                noProcess: false,
                encoding: grunt.file.defaultEncoding,
                mode: false,
                timestamp: false
            },
            uglify: {
                mangle: true,
                compress: true,
                beautify: false,
                report: false,
                sourceMap: false,
                sourceMapName: undefined,
                sourceMapIn: undefined,
                sourceMapIncludeSources: false,
                enclose: undefined,
                wrap: undefined,
                maxLineLen: 32000,
                ASCIIOnly: false,
                exportAll: false,
                preserveComments: false,
                banner: '',
                footer: ''
            }
        };

        // -- get user options (with defaults applied)

        var opts = task.options({
            concat: defaults.concat,
            uglify: defaults.uglify,
            copy: defaults.copy,
            output: 'both',
            banner: '',
            bannerOn: 'both',
        });

        // -- validate options

        var validOutputs = ['clean', 'minified', 'both'];

        if (validOutputs.indexOf(opts.output) === -1) {
            grunt.fail.warn('Invalid output option: "' + opts.output + '". Valid options: ["' + validOutputs.join('", "') + '"].');
        }
        if (validOutputs.indexOf(opts.bannerOn) === -1) {
            grunt.fail.warn('Invalid bannerOn option: "' + opts.bannerOn + '". Valid options: ["' + validOutputs.join('", "') + '"].');
        }

        // useful shortcuts
        opts.minify = _.contains(['minified', 'both'], opts.output);
        opts.keepNoMins = _.contains(['clean', 'both'], opts.output);

        // -- override with hardcoded dist behaviour

        var bannerOnMins = _.contains(['minified', 'both'], opts.bannerOn);
        var bannerOnNoMins = _.contains(['clean', 'both'], opts.bannerOn);

        /**
         * fn processor for adding banner during copy
         * @param {string} content
         */
        var addBanner = function (content) {
            return opts.banner + content;
        };

        // - adds banner to non minified files during the copy/concat operation
        // - (re)adds banner during uglify
        var overrides = {
            concat: {
                banner: (opts.keepNoMins && bannerOnNoMins) ? opts.banner : ''
            },
            copy: {
                banner: (opts.keepNoMins && bannerOnNoMins) ? addBanner : null
            },
            uglify: {
                banner: (opts.keepNoMins && bannerOnMins) ? opts.banner : ''
            }
        };

        // aply overrides (one by one because _.extend is shallow)
        _.extend(opts.concat, overrides.concat);
        _.extend(opts.copy, overrides.copy);
        _.extend(opts.uglify, overrides.uglify);

        return opts;
    };

    var randomHash = function (count) {
        if (count === 1) {
            return parseInt(16 * Math.random(), 10).toString(16);
        } else {
            var hash = '';
            for (var ix = 0; ix < count; ix++) {
                hash += randomHash(1);
            }
            return hash;
        }
    };

    var makeUniqTarget = function (target) {
        var uniqTarget = target + '_' + randomHash(6);
        return uniqTarget;
    };

    var queueTask = function (name, target, config) {
        var taskName = name + ':' + target;
        grunt.config.set(name + '.' + target, config);
        grunt.task.run(taskName);
        return taskName;
    };

    var fileNameOf = function (dest) {
        var matches = dest.match(/\/([^/]*)$/);
        return matches ? matches[1] : dest;
    };

    var validateConcatDest = function (dest) {

        if (_.endsWith(dest, '/')) {
            grunt.fail.warn('Can not copy concat files into "' + dest + '". Destination must be a target file name (with optional .js extension).');
        }
    };

    var validateCopyDest = function (dest) {

        if (!_.endsWith(dest, '/')) {
            grunt.fail.warn('Can not copy multiple files into "' + dest + '". Destination must be a target directory name with trailing "/".');
        }
    };

    var addExtension = function (filename, extensionToAdd, extensionToReplace) {

        // remove extensionToReplace if present
        if (extensionToReplace && _.endsWith(filename, extensionToReplace)) {
            filename = filename.substr(0, filename.length - extensionToReplace.length);
        }
        if (!_.endsWith(filename, extensionToAdd)) {
            filename += extensionToAdd;
        }
        return filename;
    };
};

