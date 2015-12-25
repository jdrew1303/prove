'use strict';

var _ = require('underscore'),
  constants = require('../constants')(),
  Tomita = require('tomita-parser'),
  path = require('path'),
  EventEmitter = require('events').EventEmitter;

// ----------------
// public functions
// ----------------

function getFacts(text, callback) {
  var workflow = new EventEmitter(),
    cb = callback || _.noop;

  workflow.on('validateParams', function() {
    if (!text) {
      cb(constants.REQUIRED('text'));
    } else {
      workflow.emit('parse');
    }
  });

  workflow.on('parse', function() {
    new Tomita(text, path.join(__dirname, '../../tomita/config.proto'), cb);
  });

  workflow.emit('validateParams');
}

// ---------
// interface
// ---------

exports = module.exports = {
  getFacts
};
