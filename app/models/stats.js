'use strict';

var _ = require('underscore'),
  async = require('async'),
  settings = require('../../settings'),
  redis = require('../datasources/redis'),
  validator = require('../modules/validator'),
  constants = require('../constants')(),
  EventEmitter = require('events').EventEmitter,
  ts;

// ----------------
// public functions
// ----------------

function pGet(options, callback) {
  var workflow = new EventEmitter(),
    cb = callback || _.noop,
    opts = options || {},
    channels = opts.channels || [];

  workflow.on('getStats', function() {
    if (!channels.length) {
      _.each(settings.JOBS, function(entity) {
        _.each(entity, function(item) {
          _.each(item, function(channel) {
            if (channel.indexOf('queue:hits') === 0) {
              channels.push(channel);
            }
          });
        });
      });
    }

    let states = [
        'progress',
        'success',
        'error'
      ],
      grans = _.keys(ts.granularities),
      topics = [],
      result = {};

    _.each(channels, function(channel) {
      _.each(states, function(state) {
        _.each(grans, function(gran) {
          topics.push({
            channel,
            state,
            gran
          });
        });
      });
    });
    async.each(topics, function(topic, internalCallback) {
      var size = ts.granularities[topic.gran].ttl / ts.granularities[topic.gran].duration,
        topicName = `${topic.channel.replace('queue:hits:', '')}:${topic.state}`;

      ts.getHits(topicName, topic.gran, size, function(err, response) {
        if (err) {
          internalCallback(err);
        } else {
          // redis-timeseries yields timestamps in secs
          // convert them to values in ms before yielding them client-side
          response = response.map(function(s) {
            return [s[0] * 1000, s[1]];
          });
          if (!result[topic.channel]) {
            result[topic.channel] = {};
          }
          if (!result[topic.channel][topic.gran]) {
            result[topic.channel][topic.gran] = {};
          }
          result[topic.channel][topic.gran][topic.state] = response;
          internalCallback();
        }
      });
    }, function(err) {
      if (err) {
        cb(err);
      } else {
        cb(null, result);
      }
    });
  });

  workflow.emit('getStats');
}

// ---------
// interface
// ---------

exports = module.exports = function() {
  if (!ts) {
    ts = redis.createTimeSeries('queue:hits');
    ts.granularities = {
      last_hour: {
        ttl: ts.hours(1),
        duration: ts.minutes(1)
      },
      last_day: {
        ttl: ts.days(1),
        duration: ts.hours(0.5)
      },
      last_week: {
        ttl: ts.days(7),
        duration: ts.hours(4)
      }
    };
  }
  return {
    get: pGet
  };
};
