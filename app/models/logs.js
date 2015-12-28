'use strict';

var _ = require('underscore'),
  constants = require('../constants')(),
  redis = require('../datasources/redis'),
  validator = require('../modules/validator'),
  EventEmitter = require('events').EventEmitter;

// ----------------
// public functions
// ----------------

function pGet(options, callback) {
  var workflow = new EventEmitter(),
    cb = callback || _.noop,
    opts = options || {},
    entity = opts.entity,
    stage = opts.stage,
    gran = opts.gran,
    page = opts.page,
    date = new Date(opts.date || Date.now());

  workflow.on('validateParams', function() {
    validator.check({
      entity: ['string', entity],
      stage: ['string', stage],
      gran: ['string', gran],
      date: ['date', date]
    }, function(err) {
      if (err) {
        cb(err);
      } else {
        workflow.emit('getLogs');
      }
    });
  });

  workflow.on('getLogs', function() {
    var topic = `queue:logs:${entity}:${stage}:${gran}`,
      options = {
        page: page,
        ascending: true
      };

    redis.hpage(topic, 'queue:logs', options, function(err, response) {
      if (err) {
        cb(constants.dictionary.DATABASE_ERROR);
      } else {
        cb(null, response);
      }
    });
  });

  workflow.emit('validateParams');
}

// ---------
// interface
// ---------

exports = module.exports = {
  get: pGet
};
