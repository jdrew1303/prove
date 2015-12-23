'use strict';

exports = module.exports = {
  captureMessage: function() {}
};

//var raven = require('raven'),
//  settings = require('../../settings'),
//  client;
//
//if (!client) {
//  client = new raven.Client(settings.SENTRY_URL);
//}
//
//// ----------------
//// public functions
//// ----------------
//
//var pCaptureMessage = function(name, opts) {
//  if (process.env.CURRENT_ENV === 'TEST') {
//    client.captureMessage(name, opts);
//  }
//};
//
//// ---------
//// interface
//// ---------
//
//exports = module.exports = {
//  captureMessage: pCaptureMessage
//};
