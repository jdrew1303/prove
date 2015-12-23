'use strict';

var _ = require('underscore'),
  async = require('async'),
  EventEmitter = require('events').EventEmitter,
  constants = require('../constants')(),
  db = require('../datasources/redis');

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
      db.setadd(topic, item.id, function(err) {
        internalCallback(err ? constants.dictionary.DATABASE_ERROR : null);
      });
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
