'use strict';

var _ = require('underscore'),
  async = require('async'),
  constants = require('../constants')(),
  redis = require('../datasources/redis'),
  psql = require('../datasources/postgres'),
  tomita = require('../modules/tomita'),
  EventEmitter = require('events').EventEmitter,
  myEventEmitter = require('../utils/event-emitter');

exports = module.exports = function(options, callback, logger) {
  var opts = options || {},
    cb = callback || _.noop,
    log = logger || _.noop,
    workflow = opts.profiling ? myEventEmitter() : new EventEmitter(),
    articleId,
    articleInfo,
    gotFacts = [];

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
        cb(err, false);
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
      } else {
        _.each(response.Fact, function(fact) {
          var factField = fact.Field1;
          if (factField) {
            fact = factField['$'].val;
            gotFacts.push(fact.toLowerCase());
          }
        });
        workflow.emit('saveFacts');
      }
    });
  });

  workflow.on('saveFacts', function() {
    var values = '';
    for (let i = 0, l = gotFacts.length; i < l; i += 1) {
      values += `(${articleId}, '${gotFacts[i]}')`;
      if (i < l - 1) {
        values += ',';
      }
    }
    psql.query(`INSERT INTO keywords (article_id, phrase) VALUES ${values}`, function(err) {
      if (err) {
        cb(err);
      } else {
        cb(null, true);
      }
    });
  });

  workflow.emit('getArticleId');
};
