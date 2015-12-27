'use strict';

exports = module.exports = {
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
