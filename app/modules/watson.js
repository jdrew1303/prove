'use strict';

var _ = require('underscore'),
  async = require('async'),
  zlib = require('zlib'),
  qs = require('querystring'),
  request = require('request'),
  constants = require('../constants')(),
  settings = require('../../settings'),
  EventEmitter = require('events').EventEmitter,
  baseUrl = settings.WATSON_URL,
  api_key = process.env.WATSON_KEY;

// ----------------
// public functions
// ----------------

function getKeywords(text, callback) {
  var workflow = new EventEmitter(),
    cb = callback || _.noop;

  workflow.on('validateParams', function() {
    if (!text) {
      cb(constants.REQUIRED('text'));
    } else {
      workflow.emit('request');
    }
  });

  workflow.on('request', function() {
    var queryOptions = {
      apikey: api_key,
      text: text,
      outputMode: 'json'
      //keywordExtractMode: 'strict'
    };

    request.get({
      url: `${baseUrl}/calls/text/TextGetRankedKeywords?${qs.stringify(queryOptions)}`,
      encoding: null // to get response as Buffer, needed for gunzip
    }, function(err, response, body) {
      if (err) {
        return callback(err);
      }

      var encoding = response.headers['content-encoding'];
      if (encoding === 'gzip') {
        body = zlib.gunzipSync(body);
      }

      callback(null, JSON.parse(body));
    });
  });

  workflow.emit('validateParams');
}

// ---------
// interface
// ---------

exports = module.exports = {
  getKeywords
};
