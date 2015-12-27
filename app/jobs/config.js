'use strict';

exports = module.exports = {
  articlesAdd: {
    name: 'Articles add',
    entity: 'articles',
    job: 'add',
    module: require('./articlesAdd'),
    queue: 'queue:articles:add',
    hits: 'queue:hits:articles:add',
    delay: 33, // loop delay in milliseconds
    retry: 3
  }
};
