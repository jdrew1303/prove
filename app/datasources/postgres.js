'use strict';

var pg = require('pg'),
  async = require('async'),
  _ = require('underscore'),
  settings = require('../../settings'),
  constants = require('../constants')(),
  tables = require('../../data/tables/index'),
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

function createTable(name, callback) {
  var cb = callback || _.noop;
  if (!name) {
    return cb(constants.REQUIRED('name'));
  }

  var alreadyExists;
  async.series([
    function(internalCallback) {
      if (!tables[name]) {
        internalCallback(constants.dictionary.DATABASE_SCHEMA_DOES_NOT_EXISTS);
      } else {
        internalCallback(null, true);
      }
    },
    function(internalCallback) {
      query(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='${name}')`, function(err, response) {
        if (err) {
          internalCallback(err);
        } else {
          alreadyExists = response.rows[0].exists;
          internalCallback();
        }
      });
    },
    function(internalCallback) {
      if (alreadyExists) {
        internalCallback();
      } else {
        async.eachSeries(tables[name], function(schema, internalCallback2) {
          query(schema, internalCallback2);
        }, internalCallback);
      }
    }
  ], function(err) {
    if (err) {
      cb(err);
    } else {
      cb(null, {
        success: true
      });
    }
  });
}

// ---------
// interface
// ---------

exports = module.exports = {
  query,
  createTable
};
