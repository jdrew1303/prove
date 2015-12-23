'use strict';

var db = require('../datasources/postgres')(),
  constants = require('../constants')(),
  validator = require('../modules/validator'),
  EventEmitter = require('events').EventEmitter;

exports = module.exports = function(urls, type) {
  return new Promise(function(resolve, reject) {
    var workflow = new EventEmitter();

    workflow.on('validateParams', function() {
      validator.check({
        urls: ['array', urls],
        type: ['string', type]
      }, function(err) {
        if (err) {
          reject(err);
        } else {
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
      db.query(`SELECT url FROM articles WHERE ${queryConditionStr}`, function(err, response) {
        if (err) {
          reject(err);
        } else {
          resolve(response.rows);
        }
      });
    });

    workflow.emit('validateParams');
  });
};
