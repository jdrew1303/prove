'use strict';

var _ = require('underscore'),
  psql = require('../datasources/postgres'),
  validator = require('../modules/validator'),
  constants = require('../constants')(),
  EventEmitter = require('events').EventEmitter;

exports = module.exports = function(options, callback) {
  var workflow = new EventEmitter(),
    opts = options || {},
    cb = callback || _.noop,
    urls = opts.urls,
    source = opts.source,
    sourceId;

  workflow.on('validateParams', function() {
    validator.check({
      urls: ['array', urls],
      source: ['string', source]
    }, function(err) {
      if (err) {
        cb(err);
      } else {
        workflow.emit('getSourceIdByName');
      }
    });
  });

  workflow.on('getSourceIdByName', function() {
    psql.query(`SELECT id FROM sources WHERE name='${source}'`, function(err, response) {
      if (err) {
        cb(err);
      } else if (!response.rows[0]) {
        cb(constants.SOURCE_DOES_NOT_EXISTS(source));
      } else {
        sourceId = response.rows[0].id;
        workflow.emit('checks');
      }
    });
  });

  workflow.on('checks', function() {
    var queryConditionStr = '';
    for (let i = 0, l = urls.length; i < l; i += 1) {
      queryConditionStr += `url='${urls[i]}'`;
      if (i < l - 1) {
        queryConditionStr += ' OR ';
      }
    }
    psql.query(`SELECT url FROM articles WHERE (${queryConditionStr}) AND source_id=${sourceId}`, function(err, response) {
      if (err) {
        cb(err);
      } else {
        cb(null, response.rows);
      }
    });
  });

  workflow.emit('validateParams');
};
