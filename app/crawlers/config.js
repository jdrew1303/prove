'use strict';

exports = module.exports = {
  meduza: {
    name: 'Meduza crawler',
    module: require('./meduza'),
    start_every: 1000 * 60 // in milliseconds
  },
  chaskor: {
    name: 'Chaskor crawler',
    module: require('./chaskor'),
    start_every: 1000 * 60 // in milliseconds
  }
};
