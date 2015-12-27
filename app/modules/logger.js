'use strict';

var redis = require('../datasources/redis'),
  _ = require('underscore'),
  async = require('async'),
  settings = require('../../settings'),
  constants = require('../constants')(),
  validator = require('validator'),
  jobsConfig = require('./../scheduler/config'),
  EventEmitter = require('events').EventEmitter,
  isStarted;

function clear() {
  var granularities = _.keys(settings.LOGS_GRANULARITIES),
    stages = ['progress', 'success', 'error'],
    topics = [];

  _.each(jobsConfig, function(config) {
    _.each(stages, function(stage) {
      _.each(granularities, function(gran) {
        topics.push({
          name: `queue:logs:${config.entity}:${config.job}:${stage}:${gran}`,
          gran
        });
      });
    });
  });

  async.each(topics, function(topic, callback) {
    var ttl = settings.LOGS_GRANULARITIES[topic.gran];
    redis.zremrange(topic.name, '-inf', Date.now() - ttl);
    callback();
  }, _.noop);
}

if (!isStarted) {
  setInterval(clear, 1000 * 60);
}

function save(type, typeText, message, options, callback) {
  var workflow = new EventEmitter(),
    opts = options || {},
    cb = callback || _.noop,
    d = new Date(),
    timestamp = d.getTime(),
    entity = opts.entity,
    id = opts.id,
    job = opts.job,
    stage = opts.stage;

  workflow.on('validateParams', function() {
    validator.check({
      type: ['string', type],
      typeText: ['string', typeText],
      message: ['string', message],
      entity: ['string', entity],
      id: ['string', id],
      job: ['string', job],
      stage: ['string', stage]
    }, function(err) {
      if (err) {
        cb(err);
      } else {
        workflow.emit('saveLog');
      }
    });
  });

  workflow.on('saveLog', function() {
    var logid;
    async.series([
      function(internalCallback) {
        redis.counter('g_queue_logs', function(err, value) {
          if (err || !value) {
            internalCallback(constants.dictionary.FAILED_TO_GET_ID);
          } else {
            logid = value.toString();
            internalCallback();
          }
        });
      },
      function(internalCallback) {
        var logInfo = {
          id: logid,
          type,
          entity,
          entity_id: id,
          job,
          stage,
          message,
          worker: process.env.WORKER_NAME || 'master',
          cdate: d.toISOString()
        };
        redis.hset('queue:logs', logid, logInfo, internalCallback);
      },
      function(internalCallback) {
        redis.multi([{
          operation: 'zadd',
          topic: `queue:logs:${d.yyyymmddUTC()}`,
          id: logid,
          score: timestamp
        }, {
          operation: 'zadd',
          topic: `queue:logs:${entity}`,
          id: logid,
          score: timestamp
        }, {
          operation: 'zadd',
          topic: `queue:logs:${entity}:${job}`,
          id: logid,
          score: timestamp
        }, {
          operation: 'zadd',
          topic: `queue:logs:${entity}:${id}:${job}`,
          id: logid,
          score: timestamp
        }], internalCallback);
      },
      function(internalCallback) {
        var granularities = _.keys(settings.LOGS_GRANULARITIES);
        async.each(granularities, function(gran, internalCallback2) {
          var topic = `queue:logs:${entity}:${job}:${stage}:${gran}`;
          redis.zadd(topic, logid, timestamp, internalCallback2);
        }, internalCallback);
      }
    ], function(err) {
      if (err) {
        cb(err);
      } else {
        if (process.env.VERBOSE_LOGGING) {
          console.log(`${typeText}: ${message} - ${d.toISOString()}`);
        }
        cb();
      }
    });
  });

  workflow.emit('validateParams');
}

// ----------------
// public functions
// ----------------

function pLog(message, options, callback) {
  save('log', 'LOG', message, options, callback);
}

function pError(message, options, callback) {
  save('error', '**ERROR**', message, options, callback);
}

function pWarning(message, options, callback) {
  save('warning', 'WARNING', message, options, callback);
}

function pInfo(message, options, callback) {
  save('info', 'INFO*', message, options, callback);
}

function pMove(options, callback) {
  var workflow = new EventEmitter(),
    opts = options || {},
    cb = callback || _.noop,
    job = opts.job,
    to = opts.to,
    entity = opts.entity,
    id = opts.id;

  workflow.on('validateParams', function() {
    validator.check({
      job: ['string', job],
      to: ['string', to],
      entity: ['string', entity],
      id: ['string', id]
    }, function(err) {
      if (err) {
        cb(err);
      } else {
        workflow.emit('moveLogs');
      }
    });
  });

  workflow.on('moveLogs', function() {
    async.waterfall([
      function(internalCallback) {
        redis.hpage(`queue:logs:${entity}:${id}:${job}`, 'queue:logs', {per_page: 0}, internalCallback);
      },
      function(data, internalCallback) {
        if (!data || !data.items || !data.items.length) {
          internalCallback();
        } else {
          var multiStack = [],
            granularities = _.keys(settings.LOGS_GRANULARITIES);

          _.each(granularities, function(gran) {
            _.each(data.items, function(item) {
              multiStack.push({
                operation: 'zrem',
                topic: `queue:logs:${entity}:${job}:progress:${gran}`,
                id: item.id
              });
              // do not transfer error logs to success topic
              if (to !== 'success' || item.type !== 'error') {
                multiStack.push({
                  operation: 'zadd',
                  topic: `queue:logs:${entity}:${job}:${to}:${gran}`,
                  id: item.id,
                  score: item.score
                })
              }
            });
          });
          redis.multi(multiStack, internalCallback);
        }
      }
    ], cb);
  });

  workflow.emit('validateParams');
}

function pRemove(options, callback) {
  var workflow = new EventEmitter(),
    opts = options || {},
    cb = callback || _.noop,
    job = opts.job,
    from = opts.from,
    entity = opts.entity,
    id = opts.id;

  workflow.on('validateParams', function() {
    validator.check({
      job: ['string', job],
      from: ['array', from],
      entity: ['string', entity],
      id: ['string', id]
    }, function(err) {
      if (err) {
        cb(err);
      } else {
        workflow.emit('removeLogs');
      }
    });
  });

  workflow.on('removeLogs', function() {
    async.waterfall([
      function(internalCallback) {
        redis.hpage(`queue:logs:${entity}:${id}:${job}`, 'queue:logs', {per_page: 0}, internalCallback);
      },
      function(data, internalCallback) {
        if (!data || !data.items || !data.items.length) {
          internalCallback();
        } else {
          var multiStack = [],
            granularities = _.keys(settings.LOGS_GRANULARITIES);

          _.each(from, function(stage) {
            _.each(granularities, function(gran) {
              _.each(data.items, function(item) {
                multiStack.push({
                  operation: 'zrem',
                  topic: `queue:logs:${entity}:${job}:${stage}:${gran}`,
                  id: item.id
                });
                if (item.type === 'error') {
                  multiStack.push({
                    operation: 'hdel',
                    topic: `queue:logs`,
                    id: item.id
                  });
                }
              });
            });
          });
          redis.multi(multiStack, internalCallback);
        }
      }
    ], cb);
  });

  workflow.emit('validateParams');
}

function pClearTempByEntity(options, callback) {
  var workflow = new EventEmitter(),
    opts = options || {},
    cb = callback || _.noop,
    job = opts.job,
    entity = opts.entity,
    id = opts.id;

  workflow.on('validateParams', function() {
    validator.check({
      job: ['string', job],
      entity: ['string', entity],
      id: ['string', id]
    }, function(err) {
      if (err) {
        cb(err);
      } else {
        workflow.emit('clearLogs');
      }
    });
  });

  workflow.on('clearLogs', function() {
    redis.multi([{
      operation: 'del',
      topic: `queue:logs:${entity}:${id}:${job}`
    }], cb);
  });

  workflow.emit('validateParams');
}

// ---------
// interface
// ---------

exports = module.exports = {
  log: pLog,
  error: pError,
  warning: pWarning,
  info: pInfo,
  move: pMove,
  remove: pRemove,
  clearTempByEntity: pClearTempByEntity
};
