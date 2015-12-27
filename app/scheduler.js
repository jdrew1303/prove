'use strict';

var _ = require('underscore'),
  async = require('async'),
  redis = require('./datasources/redis'),
  logger = require('./modules/logger'),
  hits = require('./modules/hits')(),
  queue = require('./modules/queue'),
  ENABLE_PROFILING = process.env.ENABLE_PROFILING === 'TRUE',
  config = require('./jobs/config'),
  validator = require('./modules/validator'),
  EventEmitter = require('events').EventEmitter,
  isStarted;

const Runner = class {
  constructor(jobConfig) {
    if (jobConfig.inProcess) {
      return;
    }
    jobConfig.inProcess = true;
    this.config = jobConfig;
    jobConfig.module(jobConfig, ((err, entityId) => this.callback(err, entityId)), ((options, callback) => this.log(options, callback)));
  }
  log(options, callback) {
    var workflow = new EventEmitter(),
      opts = options || {},
      cb = callback || _.noop,
      stage = opts.stage,
      id = opts.id,
      type = opts.type,
      message = opts.message,
      finishReg = /(success|error)/,
      jobConfig = this.config,
      logData = {
        entity: jobConfig.entity,
        job: jobConfig.job
      };

    workflow.on('validateParams', () => {
      validator.check({
        stage: ['string', stage],
        id: ['number', id],
        type: ['string', type],
        message: ['string', message]
      }, (err) => {
        if (err) {
          cb(err);
        } else {
          this.entityId = id;
          workflow.emit('saveHits');
        }
      });
    });

    workflow.on('saveHits', function() {
      hits.add({
        channel: `${jobConfig.hits}:${stage}` // stage = ('progress' || 'error' || 'success')
      }, function(err) {
        if (err) {
          cb(err);
        } else {
          workflow.emit('saveLogs');
        }
      });
    });

    workflow.on('saveLogs', function() {
      if (stage) {
        logData.stage = stage;
      }
      if (id) {
        logData.id = id;
      }
      logger[type](message, logData, function(err) {
        if (err) {
          cb(err);
        } else {
          workflow.emit('finish');
        }
      });
    });

    workflow.on('finish', function() {
      async.series([
        function(internalCallback) {
          if (finishReg.test(stage)) {
            // remove job from progress hits if job finished
            hits.remove({
              channel: `${jobConfig.hits}:progress`
            }, internalCallback);
          } else {
            internalCallback();
          }
        },
        function(internalCallback) {
          if (finishReg.test(stage)) {
            // move logs from progress to error or success
            logger.move({
              to: opts.stage,
              job: jobConfig.job,
              entity: jobConfig.entity,
              id: logData.id
            }, internalCallback);
          } else {
            internalCallback();
          }
        }
      ], cb);
    });

    workflow.emit('validateParams');
  }
  callback(jobError, result) {
    var jobConfig = this.config,
      retryTopic = `${jobConfig.queue}:error`,
      entityId = this.entityId,
      logData = {
        id: entityId
      };

    jobConfig.inProcess = false;

    if (jobError) {
      _.extend(logData, {
        type: 'error',
        stage: 'error',
        message: `Error ${jobConfig.name} for ${entityId}: ${jobError}`
      });
    } else if (result) {
      _.extend(logData, {
        type: 'info',
        stage: 'success',
        message: `Success ${jobConfig.name} for ${entityId}`
      });
    }

    if (logData) {
      this.log(logData, function(err) {
        var workflow = new EventEmitter();
        if (err) {
          console.log(err);
        }
        workflow.on('conditions', function() {
          if (jobError) {
            // retry again
            if (jobConfig.retry) {
              redis.zscore(retryTopic, entityId, function(err, response) {
                if (response !== jobConfig.retry) {
                  redis.zincrement(retryTopic, entityId, response ? 1 : 2);
                  queue.add([{
                    entity: jobConfig.entity,
                    action: jobConfig.job,
                    id: entityId
                  }]);
                } else {
                  workflow.emit('finish');
                }
              });
            } else {
              workflow.emit('finish');
            }
          } else if (result) {
            // if job fails previously, need to remove it from error logs and hits
            async.waterfall([
              function(internalCallback) {
                redis.zscore(retryTopic, entityId, internalCallback);
              },
              function(retriedTimes, internalCallback) {
                if (!retriedTimes) {
                  internalCallback();
                } else {
                  async.parallel([
                    function(internalCallback2) {
                      redis.zrem(retryTopic, entityId, internalCallback2);
                    },
                    function(internalCallback2) {
                      hits.remove({
                        channel: `${jobConfig.hits}:error`,
                        decrement: Number(retriedTimes)
                      }, internalCallback2);
                    },
                    function(internalCallback2) {
                      logger.remove({
                        from: ['progress', 'error'],
                        job: jobConfig.job,
                        entity: jobConfig.entity,
                        id: entityId
                      }, internalCallback2);
                    }
                  ], internalCallback);
                }
              }
            ], function(err) {
              if (err) {
                console.log(err);
              }
              workflow.emit('finish');
            });
          }
        });

        workflow.on('finish', () => {
          logger.clearTempByEntity({
            job: jobConfig.job,
            entity: jobConfig.entity,
            id: entityId
          }, () => {
            var delay = jobConfig.delay || 0;
            setTimeout(() => {
              return new Runner(jobConfig);
            }, delay);
          });
        });

        workflow.emit('conditions');
      });
    }
  }
};

// ----------------
// start
// ----------------

if (!isStarted) {
  isStarted = true;
  _.each(config, function(item, id) {
    item.id = id;
    if (item.queue) {
      console.log(`Subscribe to ${item.queue}`);
      redis.subscribe(item.queue);
    }
    if (ENABLE_PROFILING) {
      item.profiling = true;
    }
  });
  redis.on('message', function(channel) {
    _.each(config, function(item) {
      if (item.queue === channel) {
        return new Runner(item);
      }
    });
  });
}
