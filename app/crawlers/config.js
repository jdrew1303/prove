'use strict';

exports = module.exports = {
  crawlerMeduza: {
    name: 'Meduza crawler',
    module: require('./meduza'),
    start_every: 1000 * 60 // in milliseconds
  }
};
