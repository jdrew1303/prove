'use strict';

var _ = require('underscore'),
  settings = require('../../settings'),
  redis = require('../datasources/redis'),
  constants = require('../constants')(),
  ts;

const prefix = 'queue:hits';

// ----------------
// public functions
// ----------------

function pAdd(options, callback) {
  var cb = callback || _.noop,
    opts = options || {},
    channel = opts.channel,
    timestamp = (opts.timestamp || Date.now()) / 1000,
    increment = opts.increment || 1;

  if (!channel) {
    cb(constants.REQUIRED('channel'));
  } else {
    ts.recordHit(channel.replace(`${prefix}:`, ''), timestamp, increment).exec(cb);
  }
}

function pRemove(options, callback) {
  var cb = callback || _.noop,
    opts = options || {},
    channel = opts.channel,
    decrement = opts.decrement || 1;

  if (!channel) {
    cb(constants.REQUIRED('channel'));
  } else {
    ts.removeHit(channel.replace(`${prefix}:`, ''), Date.now(), decrement).exec(cb);
  }
}

// ---------
// interface
// ---------

exports = module.exports = function() {
  if (!ts) {
    ts = redis.createTimeSeries(prefix);
    let granularities = {};
    _.each(settings.LOGS_GRANULARITIES, function(item, key) {
      if (key.indexOf('hour') !== -1) {
        granularities[key] = {
          ttl: ts.hours(1),
          duration: ts.minutes(1)
        };
      } else if (key.indexOf('day') !== -1) {
        granularities[key] = {
          ttl: ts.days(1),
          duration: ts.hours(0.5)
        };
      } else if (key.indexOf('week') !== -1) {
        granularities[key] = {
          ttl: ts.days(7),
          duration: ts.hours(4)
        };
      }
    });
    ts.granularities = granularities;
  }
  return {
    add: pAdd,
    remove: pRemove
  };
};
