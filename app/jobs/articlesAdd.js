'use strict';

var _ = require('underscore'),
  async = require('async'),
  constants = require('../constants')(),
  redis = require('../datasources/redis'),
  psql = require('../datasources/postgres'),
  tomita = require('../modules/tomita'),
  EventEmitter = require('events').EventEmitter,
  myEventEmitter = require('../utils/event-emitter');

// crate 'keywords' table if not exists
psql.createTable('keywords');

exports = module.exports = function(options, callback, logger) {
  var opts = options || {},
    cb = callback || _.noop,
    log = logger || _.noop,
    workflow = opts.profiling ? myEventEmitter() : new EventEmitter(),
    articleId,
    articleInfo,
    gotFacts = {};

  workflow.on('getArticleId', function() {
    async.series([
      function(internalCallback) {
        redis.setpop(opts.queue, function(err, response) {
          if (err) {
            internalCallback(err);
          } else {
            articleId = response;
            internalCallback();
          }
        });
      },
      function(internalCallback) {
        if (!articleId) {
          internalCallback();
        } else {
          log({
            type: 'info',
            id: articleId,
            stage: 'progress',
            message: `Start ${opts.name} for ${articleId}`
          }, internalCallback);
        }
      }
    ], function(err) {
      if (err || !articleId) {
        cb(err);
      } else {
        workflow.emit('getArticleText');
      }
    });
  });

  workflow.on('getArticleText', function() {
    psql.query('SELECT * FROM articles WHERE id=$1::int', [articleId], function(err, response) {
      if (err) {
        cb(err);
      } else if (!response || !response.rows || !response.rows[0]) {
        cb('No article found by article ID');
      } else {
        articleInfo = response.rows[0];
        workflow.emit('parseArticle');
      }
    });
  });

  workflow.on('parseArticle', function() {
    tomita.getFacts(articleInfo.text, function(err, response) {
      if (err) {
        cb(err);
      } else if (!response) {
        cb('No facts');
      } else {
        var extractFact = function(fact, factType) {
          _.each(fact, function(item, name) {
            if (name !== '$') {
              let val = item.$.val;
              if (!gotFacts[factType]) {
                gotFacts[factType] = [];
              }
              gotFacts[factType].push(val.toLowerCase());
            }
          });
        };
        _.each(response, function(facts, factType) {
          if (_.isArray(facts)) {
            _.each(facts, function(fact) {
              extractFact(fact, factType);
            });
          } else if (_.isObject(facts)) {
            extractFact(facts, factType);
          }
        });
        workflow.emit('saveFacts');
      }
    });
  });

  workflow.on('saveFacts', function() {
    var values = '';
    _.each(gotFacts, function(factsGroup, groupName) {
      _.each(factsGroup, function(fact) {
        values += `(${articleId}, '${fact}', '${groupName}'),`;
      });
    });
    values = values.replace(/,$/, '');
    psql.query(`INSERT INTO keywords (article_id, phrase, type) VALUES ${values}`, function(err) {
      if (err) {
        cb(err);
      } else {
        cb(null, true);
      }
    });
  });

  workflow.emit('getArticleId');
};
