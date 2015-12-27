'use strict';

exports = module.exports = {
  crawlerMeduza: {
    name: 'Meduza crawler',
    entity: 'articles',
    job: 'get',
    module: require('./crawlers/meduza'),
    hits: 'queue:hits:articles:get',
    start_every: 1000 * 60 // in milliseconds
  },
  articlesParse: {
    name: 'Articles parse',
    entity: 'articles',
    job: 'parse',
    module: require('./articlesParse'),
    queue: 'queue:articles:add',
    hits: 'queue:hits:articles:add',
    delay: 33, // loop delay in milliseconds
    retry: 3
  }
};
