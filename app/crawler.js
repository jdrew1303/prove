'use strict';

var _ = require('underscore'),
  config = require('./crawlers/config'),
  scheduledJobs = {},
  schedulerStep = 1000 * 60, // start scheduler every minute
  ENABLE_PROFILING = process.env.ENABLE_PROFILING === 'TRUE',
  isStarted;

const Runner = class {
  constructor(jobConfig) {
    if (jobConfig.inProcess) {
      return;
    }
    jobConfig.inProcess = true;
    jobConfig.module(jobConfig);
  }
};

function getTimestamp(time) {
  time = time ? new Date(time) : new Date();
  var year = time.getUTCFullYear(),
    month = time.getUTCMonth(),
    day = time.getUTCDate(),
    hour = time.getUTCHours(),
    minute = time.getUTCMinutes();

  return `${year}:${month}:${day}:${hour}:${minute}`;
}

function addJobToSchedule(jobName) {
  var jobTime = config[jobName].start_every;
  jobTime = (_.isFunction(jobTime) ? jobTime() : jobTime);
  if (jobTime < schedulerStep) {
    throw new Error(`Scheduler job time can't be less than ${schedulerStep} ms`);
  }

  jobTime = getTimestamp(Date.now() + jobTime);
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

function timeJobsChecker() {
  var curTimestamp = getTimestamp(),
    timeCell = scheduledJobs[curTimestamp] || [];

  _.each(timeCell, function(jobItem) {
    new Runner(config[jobItem]);
    updateJobScheduleTime(jobItem, curTimestamp);
  });
  setTimeout(timeJobsChecker, schedulerStep);
}

if (!isStarted) {
  let hasTimeJobs;
  isStarted = true;
  _.each(config, function(item, id) {
    item.id = id;
    if (item.start_every) {
      addJobToSchedule(id);
      hasTimeJobs = true;
    }
    if (ENABLE_PROFILING) {
      item.profiling = true;
    }
  });
  if (hasTimeJobs) {
    setTimeout(timeJobsChecker, schedulerStep);
  }
}