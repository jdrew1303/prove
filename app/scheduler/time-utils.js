'use strict';

var _ = require('underscore'),
  config = require('scheduler/config');

function getTimestamp(time) {
  time = time ? new Date(time) : new Date();
  var year = time.getUTCFullYear(),
    month = time.getUTCMonth(),
    day = time.getUTCDate(),
    hour = time.getUTCHours(),
    minute = time.getUTCMinutes();

  return `${year}:${month}:${day}:${hour}:${minute}`;
}

function addJobToSchedule(jobName, scheduledJobs, minInterval) {
  var jobTime = config[jobName].start_every;
  jobTime = (_.isFunction(jobTime) ? jobTime() : jobTime);
  if (jobTime < minInterval) {
    throw new Error(`Scheduler job time can't be less than ${minInterval} ms`);
  }

  jobTime = getTimestamp(Date.now() + jobTime);
  if (!scheduledJobs[jobTime]) {
    scheduledJobs[jobTime] = [];
  }
  scheduledJobs[jobTime].push(jobName);
}

function updateJobScheduleTime(jobName, scheduledJobs, time) {
  var timeCell = scheduledJobs[time];
  if (timeCell) {
    timeCell.splice(timeCell.indexOf(jobName), 1);
    if (!timeCell.length) { // no jobs in current time cell
      delete scheduledJobs[time];
    }
  }
  addJobToSchedule(jobName);
}

function getJobs(scheduledJobs) {
  var curTimestamp = getTimestamp(),
    timeCell = scheduledJobs[curTimestamp] || [];

  _.each(timeCell, function(jobItem) {
    updateJobScheduleTime(jobItem, scheduledJobs, curTimestamp);
  });
  return timeCell;
}

exports = module.exports = {
  addJobToSchedule,
  getJobs
};
