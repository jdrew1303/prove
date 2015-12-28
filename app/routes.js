'use strict';

var express = require('express'),
  bodyParser = require('body-parser'),
  path = require('path'),
  controllers = require('./controllers/index');

exports = module.exports = function(app) {
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  app.use('/static', express.static(path.join(__dirname, '../public/www')));
  app.use(express.static(path.join(__dirname, '../public/www')));

  /*jshint es5: true */
  app.get('/dummy', controllers.dummy.getTrue);

  /*jshint es5: false */
};
