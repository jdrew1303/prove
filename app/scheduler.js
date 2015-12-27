'use strict';

var _ = require('underscore'),
  async = require('async'),
  redis = require('../app/datasources/redis'),
  logger = require('./logger'),
  hits = require('./hits')(),
  queue = require('./queue'),
  ENABLE_PROFILING = process.env.ENABLE_PROFILING === 'TRUE',
  config = require('./config'),
  scheduledJobs = {},
  schedulerStep = 1000 * 60, // start scheduler every minute
  isStarted;

require('../libs/date'); // extend date object

function getTimestamp(time) {
  time = time ? new Date(time) : new Date();
  var year = time.getUTCFullYear(),
    month = time.getUTCMonth(),
    day = time.getUTCDate(),
    hour = time.getUTCHours(),
    minute = time.getUTCMinutes();

  return `${year}:${month}:${day}:${hour}:${minute}`;
}

function getNextExecutionTime(jobName) {
  var jobTime = config[jobName].start_every;
  jobTime = (_.isFunction(jobTime) ? jobTime() : jobTime);
  if (jobTime < schedulerStep) {
    throw new Error(`Scheduler job time can't be less than ${schedulerStep} ms`);
  }

  return getTimestamp(Date.now() + jobTime);
}

function addJobToSchedule(jobName) {
  var jobTime = getNextExecutionTime(jobName);
  if (!scheduledJobs[jobTime]) {
    scheduledJobs[jobTime] = [];
  }
  scheduledJobs[jobTime].push(jobName);
}

function updateJobScheduleTime(jobName, time) {
  var timeCell = scheduledJobs[time];
  if (timeCell) {
    timeCell.splice(timeCell.indexOf(jobName), 1);
    if (!timeCell.length) { // no jobs in current time cell
      delete scheduledJobs[time];
    }
  }
  addJobToSchedule(jobName);
}

function runner(jobConfig) {
  if (jobConfig.inProcess) {
    return;
  }
  jobConfig.inProcess = true;
  var module = jobConfig.module,
    logInfo = {
      entity: jobConfig.entity,
      job: jobConfig.job
    };

  function log(options, callback) {
    var opts = options || {},
      cb = callback || _.noop,
      finishReg = /(success|error)/;

    async.series([
      function(internalCallback) {
        if (opts.stage) {
          hits.add({
            channel: `${jobConfig.hits}:${opts.stage}` // stage = ('progress' || 'error' || 'success')
          }, function(err) {
            if (err) {
              internalCallback(err);
            } else {
              if (finishReg.test(opts.stage)) {
                // remove job from progress hits if job finished
                hits.remove({
                  channel: `${jobConfig.hits}:progress`
                }, internalCallback);
              } else {
                internalCallback();
              }
            }
          });
        } else {
          internalCallback();
        }
      },
      function(internalCallback) {
        if (opts.stage) {
          logInfo.stage = opts.stage;
        }
        if (opts.id) {
          logInfo.id = opts.id;
        }
        logger[opts.type](opts.message, logInfo, function() {
          if (finishReg.test(opts.stage)) {
            // move logs from progress to error or success
            logger.move({
              to: opts.stage,
              job: jobConfig.job,
              entity: jobConfig.entity,
              id: logInfo.id
            }, internalCallback);
          } else {
            internalCallback();
          }
        });
      }
    ], cb);
  }

  function callback(err, result) {
    var retryTopic = `${jobConfig.queue}:error`,
      logData;

    if (err) {
      logData = {
        type: 'error',
        stage: 'error',
        message: `Error ${jobConfig.name} for ${logInfo.id}: ${err}`
      };
    } else if (result === true) {
      logData = {
        type: 'info',
        stage: 'success',
        message: `Success ${jobConfig.name} for ${logInfo.id}`
      };
    } else {
      jobConfig.inProcess = false;
    }

    if (logData) {
      log(logData, function() {
        if (err) {
          // retry again
          if (jobConfig.retry) {
            redis.zscore(retryTopic, logInfo.id, function(err, response) {
              if (response !== jobConfig.retry) {
                redis.zincrement(retryTopic, logInfo.id, response ? 1 : 2);
                queue.add([{
                  entity: jobConfig.entity,
                  action: jobConfig.job,
                  id: logInfo.id
                }]);
              }
            });
          } else {
            logger.clearTempByEntity({
              job: jobConfig.job,
              entity: jobConfig.entity,
              id: logInfo.id
            }, function() {
              var delay = jobConfig.delay || 0;
              setTimeout(function() {
                module(jobConfig, callback, log);
              }, delay);
            });
          }
        } else if (result === true) {
          // if job fails previously, need to remove it from error logs and hits
          async.waterfall([
            function(internalCallback) {
              redis.zscore(retryTopic, logInfo.id, internalCallback);
            },
            function(retriedTimes, internalCallback) {
              if (!retriedTimes) {
                internalCallback();
              } else {
                async.parallel([
                  function(internalCallback2) {
                    redis.zrem(retryTopic, logInfo.id, internalCallback2);
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
                      id: logInfo.id
                    }, internalCallback2);
                  }
                ], internalCallback);
              }
            }
          ], function() {
            logger.clearTempByEntity({
              job: jobConfig.job,
              entity: jobConfig.entity,
              id: logInfo.id
            }, function() {
              var delay = jobConfig.delay || 0;
              setTimeout(function() {
                module(jobConfig, callback, log);
              }, delay);
            });
          });
        }
      });
    }
  }

  module(jobConfig, callback, log);
}

function cronChecker() {
  var curTimestamp = getTimestamp(),
    timeCell = scheduledJobs[curTimestamp];

  if (timeCell && timeCell.length) {
    _.each(timeCell, function(jobItem) {
      updateJobScheduleTime(jobItem, curTimestamp);
      runner(config[jobItem]);
    });
  }
  setTimeout(cronChecker, schedulerStep);
}

if (!isStarted) {
  let hasTimeJobs;
  isStarted = true;
  _.each(config, function(item, id) {
    item.id = id;
    if (item.queue) {
      console.log(`Subscribe to ${item.queue}`);
      redis.subscribe(item.queue);
      if (ENABLE_PROFILING) {
        item.profiling = true;
      }
    }
    if (item.start_every) {
      addJobToSchedule(id);
      hasTimeJobs = true;
    }
  });
  redis.on('message', function(channel) {
    _.each(config, function(item) {
      if (item.queue === channel) {
        runner(item);
      }
    });
  });
  if (hasTimeJobs) {
    setTimeout(cronChecker, schedulerStep);
  }
}
