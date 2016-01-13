module.exports = function(grunt) {
  'use strict';

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    
    requirejs: {
      demo: {
        options: {
          baseUrl: 'demo/src',
          mainConfigFile: 'demo/src/require-config.js',
          optimize: 'none',

          name: '../../node_modules/almond/almond',
          include: ['main'],
          insertRequire: [ 'main'],
          out: 'demo/demo.js',
          wrap: true
        }
      }
    },

    uglify: {
      minified: {
        files: {
          'grlg.min.js': [
            'src/grlg.js'
          ]
        }
      }
    },

    version: {
      defaults: {
        src: ['package.json']
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-version');

  grunt.registerTask('default', ['uglify']);
  grunt.registerTask('build-demo', ['requirejs:demo']);
  grunt.registerTask('build', ['default', 'build-demo']);
};