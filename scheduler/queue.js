'use strict';

var _ = require('underscore'),
  async = require('async'),
  EventEmitter = require('events').EventEmitter,
  constants = require('../app/constants')(),
  redis = require('../app/datasources/redis');

// ----------------
// public functions
// ----------------

function add(options, callback) {
  var workflow = new EventEmitter(),
    cb = callback || _.noop,
    opts = options || [];

  workflow.on('validateParams', function() {
    var errors = [];
    _.each(opts, function(item) {
      if (!item.entity) {
        errors.push(constants.REQUIRED('entity'));
      }
      if (!item.action) {
        errors.push(constants.REQUIRED('action'));
      }
    });
    if (errors.length) {
      cb(errors);
    } else {
      workflow.emit('saveQueue');
    }
  });

  workflow.on('saveQueue', function() {
    async.each(opts, function(item, internalCallback) {
      var topic = `queue:${item.entity}:${item.action}`;
      async.parallel([
        function(internalCallback2) {
          redis.setadd(topic, item.id, function(err) {
            internalCallback2(err ? constants.dictionary.DATABASE_ERROR : null);
          });
        },
        function(internalCallback2) {
          redis.publish(topic, Date.now(), function(err) {
            internalCallback2(err ? constants.dictionary.DATABASE_ERROR : null);
          });
        }
      ], internalCallback);
    }, cb);
  });

  workflow.emit('validateParams');
}

// ---------
// interface
// ---------

exports = module.exports = {
  add
};
