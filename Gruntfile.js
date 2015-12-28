'use strict';

var seleniumServer = require('selenium-standalone'),
  path = require('path'),
  webpack = require('webpack'),
  WebpackDevServer = require('webpack-dev-server'),
  webpackConfig = require('./webpack.config.js'),
  htmlPlugin = require('html-webpack-plugin'),
  wdioConfFile = './wdio.conf.js';

module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-webdriver');
  grunt.loadNpmTasks('grunt-jscs');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-express-server');
  grunt.initConfig({
    express: {
      options: {
        port: 8081
      },
      dev: {
        options: {
          script: './server.js'
        }
      }
    },
    watch: {
      scripts: {
        files: ['app/**/*.js', 'server.js'],
        tasks: ['express'],
        options: {
          spawn: false
        }
      }
    },
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

  grunt.task.registerTask('webpack:build', function() {
    var done = this.async(),
      myConfig = Object.create(webpackConfig);

    myConfig.plugins = myConfig.plugins.concat(
      new webpack.DefinePlugin({
        'process.env': {
          // This has effect on the react lib size
          'NODE_ENV': JSON.stringify('production'),
          'CURRENT_ENV': JSON.stringify('PROD')
        }
      }),
      new webpack.optimize.DedupePlugin(),
      new webpack.optimize.UglifyJsPlugin()
    );

    // run webpack
    webpack(myConfig, function(err, stats) {
      if (err) throw new Error(err);
      grunt.log.write('[webpack:build]', stats.toString({
        colors: true
      }));
      done();
    });
  });

  grunt.task.registerTask('webpack:build-dev', function() {
    var myConfig = Object.create(webpackConfig);
    myConfig.devtool = 'eval';
    myConfig.entry.main.unshift('webpack-dev-server/client?http://localhost:8080/', 'webpack/hot/only-dev-server');
    myConfig.output.publicPath = 'http://localhost:8080/';
    myConfig.plugins.unshift(
      new webpack.HotModuleReplacementPlugin(),
      new webpack.NoErrorsPlugin()
    );
    myConfig.plugins.push(
      new htmlPlugin({
        filename: 'index.html',
        template: './dashboard/index.html',
        socketUrl: 'http://localhost:8081'
      })
    );

    // Start a webpack-dev-server
    new WebpackDevServer(webpack(myConfig), {
      stats: {
        colors: true
      }
    }).listen(8080, 'localhost', function(err) {
      if (err) throw new Error(err);
    });
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

  grunt.registerTask('default', [
    'webpack:build-dev',
    'express',
    'watch'
  ]);

  grunt.registerTask('build', ['webpack:build']);
};
