'use strict';

var seleniumServer = require('selenium-standalone'),
  path = require('path'),
  wdioConfFile = './wdio.conf.js';

module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-webdriver');
  grunt.loadNpmTasks('grunt-jscs');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.initConfig({
    webdriver: {
      test: {
        configFile: wdioConfFile
      }
    },
    jscs: {
      src: [
        'app/**/*.js'
      ],
      options: {
        preset: 'airbnb',
        config: '.jscsrc'
      }
    },
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      all: [
        'app/**/*.js'
      ]
    }
  });

  var seleniumProcess;
  grunt.task.registerTask('seleniumInstall', function() {
    var done = this.async();
    seleniumServer.install({
      baseURL: 'http://selenium-release.storage.googleapis.com',
      version: '2.48.2'
    }, done);
  });
  grunt.task.registerTask('seleniumStart', function() {
    var done = this.async();
    seleniumServer.start({}, function(err, response) {
      if (err) {
        done(err);
      } else {
        seleniumProcess = response;
        done();
      }
    });
  });
  grunt.task.registerTask('seleniumStop', function() {
    seleniumProcess.kill();
  });
  grunt.task.registerTask('restoreConfig', function() {
    var oldConfFile = `${wdioConfFile}.old`;
    if (grunt.file.exists(oldConfFile)) {
      grunt.file.copy(oldConfFile, wdioConfFile);
      grunt.file.delete(oldConfFile);
    }
  });

  grunt.task.registerTask('crawler', function() {
    grunt.option('force', true);
    process.on('SIGINT', () => {
      this.async()(false);
    });
    var tasks = [
        'seleniumInstall',
        'seleniumStart',
        'webdriver',
        'seleniumStop'
      ],
      target = grunt.option('target'),
      wdioConf = require(wdioConfFile).config;

    if (!target) {
      return grunt.fail.warn('`target` is required');
    } else if (!grunt.file.exists(`./app/sites/${target}.js`)) {
      return grunt.fail.warn(`target doesn't exist`);
    }

    wdioConf.specs = [`./app/sites/${target}.js`];

    let confBackupFile = `${wdioConfFile}.old`;
    grunt.file.copy(wdioConfFile, confBackupFile);
    grunt.file.write(wdioConfFile, 'exports.config = ' + JSON.stringify(wdioConf, null, 2));
    tasks.push('restoreConfig');

    console.log('Started crawler for `%s`', target);
    grunt.task.run(tasks);
  });
};
