'use strict';

var webpack = require('webpack'),
  WebpackDevServer = require('webpack-dev-server'),
  webpackConfig = require('./webpack.config.js'),
  htmlPlugin = require('html-webpack-plugin'),
  wdioConfFile = './wdio.conf.js';

module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt);
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
        'app/**/*.js',
        'dashboard/**/*.js'
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
        'app/**/*.js',
        'dashboard/**/*.js'
      ]
    },
    eslint: {
      options: {
        configFile: '.eslintrc'
      },
      target: [
        'dashboard/**/*.js',
        'dashboard/**/*.jsx'
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

  grunt.registerTask('default', [
    'webpack:build-dev',
    'express',
    'watch'
  ]);

  grunt.registerTask('build', ['webpack:build']);

  grunt.registerTask('syntax', ['jscs', 'jshint', 'eslint']);

  grunt.registerTask('utils', function() {
    var done = this.async(),
      target = grunt.option('target'),
      env = grunt.option('env'),
      args = grunt.option('args');

    require('./utils/index')(grunt, done, env, target, args);
  });
};
