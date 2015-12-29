'use strict';

var _ = require('underscore'),
  request = require('request'),
  zlib = require('zlib'),
  async = require('async'),
  jsdom = require('jsdom'),
  psql = require('../datasources/postgres'),
  queue = require('../modules/queue'),
  checkExisting = require('../modules/check-existing'),
  baseUrl = 'http://www.chaskor.ru',
  pagesLimit = 10,
  types = [
    'society',
    'economy',
    'world',
    'culture',
    'media',
    'tech',
    'health',
    'exotic',
    'books',
    'correspondence'
  ],
  EventEmitter = require('events').EventEmitter,
  myEventEmitter = require('../utils/event-emitter');

// crate 'articles' table if not exists
psql.createTable('articles');

function getArticleDate(textDate) {
  var date,
    time,
    months = [
      'января',
      'февраля',
      'марта',
      'апреля',
      'мая',
      'июня',
      'июля',
      'августа',
      'сентября',
      'октября',
      'ноября',
      'декабря'
    ];

  textDate = textDate.match(/^[^,]+, ([^,]+), (.+$)/);

  date = textDate[1].split(' ');
  time = textDate[2].split('.');

  return new Date(Number(date[2]), months.indexOf(date[1]), Number(date[0]), Number(time[0]), Number(time[1]));
}

exports = module.exports = function(options, callback) {
  var opts = options || {},
    cb = callback || _.noop,
    savedArticles = 0,
    spentTime = new Date();

  console.log('Crawler for `Chaskor` is started');

  async.eachSeries(types, function(type, internalCallback) {
    var curPage = 1,
      workflow = opts.profiling ? myEventEmitter() : new EventEmitter();

    workflow.on('getArticlesList', function() {
      request.get({
        url: `${baseUrl}/${type}/?b=${curPage}`,
        encoding: null // to get response as Buffer, needed for gunzip
      }, function(err, response, body) {
        if (err) {
          return internalCallback(err);
        }

        var encoding = response.headers['content-encoding'];
        if (encoding === 'gzip') {
          body = zlib.gunzipSync(body);
        }
        jsdom.env(body.toString(), function(err, window) {
          if (err) {
            return internalCallback(err);
          }

          var doc = window.document,
            links = doc.querySelectorAll('.centerblock h2 a'),
            collections = _.map(links, function(linkEl) {
              return linkEl.href;
            });

          window.close();
          checkExisting({
            urls: collections,
            source: 'chaskor'
          }, function(err, alreadyExistingArticles) {
            if (err) {
              return internalCallback(err);
            }

            if (alreadyExistingArticles.length) {
              alreadyExistingArticles = _.pluck(alreadyExistingArticles, 'url');
            }

            var onlyNotExistingArticles = _.difference(collections, alreadyExistingArticles);

            if (!onlyNotExistingArticles.length) {
              internalCallback();
            } else {
              workflow.emit('getArticlesText', onlyNotExistingArticles);
            }
          });
        });
      });
    });

    workflow.on('getArticlesText', function(urls) {
      async.each(urls, function(article_url, internalCallback2) {
        request.get({
          url: `${baseUrl}${article_url}`,
          encoding: null // to get response as Buffer, needed for gunzip
        }, function(err, response, body) {
          if (err) {
            return internalCallback2(err);
          }

          var encoding = response.headers['content-encoding'];
          if (encoding === 'gzip') {
            body = zlib.gunzipSync(body);
          }

          console.log(`${baseUrl}/${article_url}`);
          jsdom.env(body.toString(), function(err, window) {
            if (err) {
              return internalCallback2(err);
            }

            var doc = window.document,
              text = '',
              title = doc.querySelector('.centerblock h2'),
              subtitle = doc.querySelector('.centerblock h2 font'),
              contentChilds = doc.querySelectorAll('.maintext > *'),
              published_at = doc.querySelector('.centerblock table td:nth-child(2)');

            if (!title || !published_at) {
              return internalCallback2();
            }
            title = title.textContent;
            published_at = published_at.textContent;
            if (subtitle) {
              title = title.replace(subtitle.textContent, '');
            }
            title = title.trim();
            if (title === '' || published_at === '') {
              return internalCallback2();
            }

            published_at = getArticleDate(published_at);

            Array.prototype.every.call(contentChilds, function(item) {
              if (item.nodeName === 'BR') {
                return false;
              }

              var content = item.textContent;
              if (content.indexOf('<!--') === -1 && content.indexOf('VK.Widgets') === -1) {
                text += content;
              }
              return true;
            });

            window.close();

            var fields = [
              'source_id',
              'url',
              'text',
              'title',
              'published'
            ];

            psql.query(`INSERT INTO articles (${fields.join(',')}) VALUES (2, $1::text, $2::text, $3::text, $4::timestamp) RETURNING id`, [article_url, text, title, published_at], function(err, response) {
              if (err) {
                internalCallback2(err);
              } else {
                savedArticles += 1;
                var newArticleId = response.rows[0].id; // id of inserted article
                queue.add([{
                  entity: 'articles',
                  action: 'add',
                  id: newArticleId
                }], internalCallback2);
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
    console.log('Crawler for `Chaskor` is stopped');
    console.log('Saved articles: %d', savedArticles);
    spentTime = ((new Date().getTime() - spentTime.getTime()) / 1000 / 60).toFixed(2);
    console.log('Spent time: %d minute', spentTime);
    if (err) {
      cb(err);
    } else {
      cb(null, null);
    }
  });
};
module.exports();
