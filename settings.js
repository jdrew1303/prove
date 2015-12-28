exports = module.exports = {
  SITE_NAME: 'Prove news',
  SITE_URL: 'http://prove.news/',
  TIMEZONE: 'Europe/Moscow',

  POSTGRES_USERNAME: 'postgres',
  POSTGRES_PASSWORD: 'test',
  POSTGRES_DATABASE: 'prove',

  REDIS_PREFIX: 'prove:',

  SENTRY_URL: '',

  JOBS: {
    articles: {
      add: {
        hits: 'queue:hits:articles:add',
        logs: 'queue:logs:articles:add'
      }
    }
  },

  LOGS_GRANULARITIES: {
    last_hour: 1000 * 60 * 60,
    last_day: 1000 * 60 * 60 * 24,
    last_week: 1000 * 60 * 60 * 24 * 7
  }
};
