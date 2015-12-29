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
      workflow.emit('prepareText');
    }
  });

  workflow.on('prepareText', function() {
    // need to remove dots from short form of types of streets and cities
    // because Tomita parser will split text for sentences by dots
    text = text.replace(/(ул|г|просп|ш)\./g, '$1');
    workflow.emit('parse');
  });

  workflow.on('parse', function() {
    return new Tomita(text, path.join(__dirname, '../tomita/config.proto'), cb);
  });

  workflow.emit('validateParams');
}

// ---------
// interface
// ---------

exports = module.exports = {
  getFacts
};
