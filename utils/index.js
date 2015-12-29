'use strict';

var _ = require('underscore'),
  qs = require('querystring');

var utils = [
  './getFacts'
];

exports = module.exports = function(grunt, done, env, target, args) {
  env = env && env.toUpperCase();
  if (!env) {
    env = 'TEST';
  }
  process.env.CURRENT_ENV = env;

  target = './' + target;
  if (target && _.contains(utils, target)) {
    grunt.option('stack', true);

    require('../app/libs/date');

    var options = qs.parse(args) || {};
    require(target)(options, function(err, response) {
      if (err) {
        grunt.option('stack', false);
        grunt.log.error(err);
        done(false);
      } else {
        if (response) {
          grunt.log.writeln(response);
        }
        done();
      }
    });
  } else {
    // help
    grunt.log.error('');
    grunt.log.writeln('Usage:');
    grunt.log.writeln('grunt utils --target=utilityName [--env=dev|prod] [--args="arg1=argValue"]');
    grunt.log.writeln();
    grunt.log.writeln('Available utils:');
    _.each(utils, function(item) {
      grunt.log.writeln(' - ' + item.replace('./', ''));
    });
    done(false);
  }
};
