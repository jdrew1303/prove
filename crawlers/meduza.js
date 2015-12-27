'use strict';

var _ = require('underscore'),
  request = require('request'),
  zlib = require('zlib'),
  async = require('async'),
  qs = require('querystring'),
  Q = require('q'),
  jsdom = require('jsdom'),
  psql = require('../app/datasources/postgres'),
  queue = require('../scheduler/queue'),
  checkExisting = require('../app/modules/check-existing'),
  baseUrl = 'https://meduza.io/api/v3',
  pagesLimit = 100,
  perPage = 100,
  types = [
    'news',
    'articles',
    'cards',
    'polygon',
    'shapito'
  ],
  EventEmitter = require('events').EventEmitter,
  myEventEmitter = require('../utils/event-emitter');

exports = module.exports = function(options, callback, logger) {
  var opts = options || {},
    cb = callback || _.noop,
    log = logger || _.noop,
    savedArticles = 0,
    spentTime = new Date();

  console.log('Crawler for `Meduza` is started');

  async.each(types, function(type, internalCallback) {
    var curPage = 1,
      workflow = opts.profiling ? myEventEmitter() : new EventEmitter();

    workflow.on('getArticlesList', function() {
      var queryOptions = {
        chrono: type,
        page: curPage,
        per_page: perPage,
        locale: 'ru'
      };
      request.get({
        url: `${baseUrl}/search?${qs.stringify(queryOptions)}`,
        encoding: null // to get response as Buffer, needed for gunzip
      }, Q.async(function*(err, response, body) {
        if (err) {
          return internalCallback(err);
        }

        var encoding = response.headers['content-encoding'];
        if (encoding === 'gzip') {
          body = zlib.gunzipSync(body);
        }
        body = JSON.parse(body);

        var collections = body.collection;
        if (!collections || !collections.length) {
          return internalCallback();
        }

        var alreadyExistingArticles = yield checkExisting(collections, 'meduza');
        if (alreadyExistingArticles.length) {
          alreadyExistingArticles = _.pluck(alreadyExistingArticles, 'url');
        }

        var onlyNotExistingArticles = _.difference(collections, alreadyExistingArticles);
        onlyNotExistingArticles = _.filter(onlyNotExistingArticles, function(item) {
          return !/^quiz/.test(item);
        });

        if (!onlyNotExistingArticles.length) {
          // need to leave only internalCallback(); when script will be run by cron
          //if (curPage < pagesLimit) {
          //  curPage += 1;
          //  workflow.emit('getArticlesList');
          //} else {
          internalCallback();
          //}
          //
        } else {
          workflow.emit('getArticlesText', onlyNotExistingArticles);
        }
      }));
    });

    workflow.on('getArticlesText', function(urls) {
      async.each(urls, function(article_url, internalCallback2) {
        console.log(`${baseUrl}/${article_url}`);
        request.get({
          url: `${baseUrl}/${article_url}`,
          encoding: null // to get response as Buffer, needed for gunzip
        }, function(err, response, body) {
          if (err) {
            return internalCallback2(err);
          }

          var encoding = response.headers['content-encoding'];
          if (encoding === 'gzip') {
            body = zlib.gunzipSync(body);
          }
          body = JSON.parse(body).root;

          var text = body.content.body,
            title = body.title,
            published_at = new Date(body.published_at);

          jsdom.env(text, function(err, window) {
            if (err) {
              return internalCallback2(err);
            }

            var doc = window.document,
              bodyNodeNews = doc.querySelector('.Body'),
              bodyNodeCards = doc.querySelector('.Card');

            if (bodyNodeNews) {
              text = bodyNodeNews.textContent;
            }
            if (bodyNodeCards) {
              text = '';
              let cards = bodyNodeCards.querySelectorAll('.CardChapter-body');
              _.each(cards, function(card) {
                text += card.textContent;
              });
            }

            var fields = [
              'source_id',
              'url',
              'text',
              'title',
              'published'
            ];

            psql.query(`INSERT INTO articles (${fields.join(',')}) VALUES (1, $1::text, $2::text, $3::text, $4) RETURNING id`, [article_url, text, title, published_at], function(err, response) {
              if (err) {
                internalCallback2(err);
              } else {
                savedArticles += 1;
                var newArticleId = response.rows[0].id; // id of inserted article
                async.parallel([
                  function(internalCallback3) {
                    log({
                      type: 'info',
                      id: newArticleId,
                      stage: 'progress',
                      message: `Downloaded and saved`
                    }, internalCallback3);
                  },
                  function(internalCallback3) {
                    queue.add([{
                      entity: 'articles',
                      action: 'add',
                      id: newArticleId
                    }], internalCallback3);
                  }
                ], internalCallback2);
              }
            });
          });
        });
      }, function(err) {
        if (err) {
          internalCallback(err);
        } else {
          if (curPage < pagesLimit) {
            curPage += 1;
            workflow.emit('getArticlesList');
          } else {
            internalCallback();
          }
        }
      });
    });

    workflow.emit('getArticlesList');
  }, function(err) {
    if (err) {
      cb(err);
    } else {
      console.log('Crawler for `Meduza` is stopped');
      console.log('Saved articles: %d', savedArticles);
      spentTime = ((new Date().getTime() - spentTime.getTime()) / 1000 / 60).toFixed(2);
      console.log('Spent time: %d minute', spentTime);
    }
    cb(null, false);
  });
};
