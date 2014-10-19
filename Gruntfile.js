'use strict';

module.exports = function (grunt) {

    require('load-grunt-tasks')(grunt);

    var config = {

        jshint: {

            options: {
                jshintrc: '.jshintrc'
            },

            all: [
                'Gruntfile.js',
                'tasks/*.js'
            ]
        },

        jsbeautifier: {

            options: {
                config: '.jsbeautifyrc'
            },

            modify: {
                src: [
                    'Gruntfile.js',
                    'tasks/*.js'
                ]
            },

            verify: {
                src: [
                    'Gruntfile.js',
                    'tasks/*.js'
                ],
                options: {
                    mode: 'VERIFY_ONLY'
                }
            }
        }
    };

    // Default task.
    grunt.registerTask('default', ['jshint', 'jsbeautifier']);

    //
    grunt.initConfig(config);

};

