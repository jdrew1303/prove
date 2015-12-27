'use strict';

var _ = require('underscore'),
  usage = require('usage'),
  EventEmitter = require('events').EventEmitter;

exports = module.exports.EventEmitter = function() {
  var workflow = new EventEmitter(),
    label;

  workflow._emit = workflow.emit;
  workflow.emit = function() {
    var args = _.values(arguments);
    if (args[0]) {
      if (label !== args[0]) {
        if (label) {
          console.timeEnd(label);
        }
        label = args[0];
        console.time(label);
      }
      usage.lookup(process.pid, function(err, result) {
        var msg = '[%s] CPU %s%, Memory: %d';
        console.log(msg, args[0], result.cpu, result.memory / 1024);
      });
    }
    workflow._emit.apply(this, args);
  };
  return workflow;
};
