'use strict';

var pg = require('pg'),
  _ = require('underscore'),
  settings = require('../../settings'),
  constants = require('../constants')(),
  db_username = process.env.POSTGRES_USERNAME || settings.POSTGRES_USERNAME,
  db_password = process.env.POSTGRES_PASSWORD || settings.POSTGRES_PASSWORD,
  db_database = process.env.POSTGRES_DATABASE || settings.POSTGRES_DATABASE;

function getClient(callback) {
  var cb = callback || _.noop;
  pg.connect(`postgres://${db_username}:${db_password}@localhost/${db_database}`, cb);
}

// ----------------
// public functions
// ----------------

function query(query_string, fields, callback) {
  var cb = (_.isFunction(fields) ? fields : callback) || _.noop;
  fields = !_.isFunction(fields) ? fields : [];
  query_string = (query_string || '').trim();
  if (!_.isString(query_string) || !query_string.length) {
    cb(constants.REQUIRED('query_string'));
  } else {
    getClient(function(err, client, done) {
      if (err) {
        return cb(err);
      }

      client.query(query_string, fields, function(err, response) {
        done();
        if (err) {
          cb(err);
        } else {
          cb(null, response);
        }
      });
    });
  }
}

// ---------
// interface
// ---------

exports = module.exports = {
  query
};
