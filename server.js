'use strict';

var express = require('express'),
  app = express(),
  server = require('http').Server(app),
  MODE = (process.env.ENV || 'test').toUpperCase(),
  defaultPort = 8080;

if (MODE === 'PROD') {
  console.log('Running PROD server...');
  process.env.CURRENT_ENV = 'PROD';
} else {
  console.log('Running TEST server...');
  process.env.CURRENT_ENV = 'TEST';
  defaultPort = 8081;
}

app.SERVER = String(process.env.SERVER_NAME || 'localhost');
app.PORT = Number(process.env.PORT || defaultPort);

app.SERVER_PATH = 'http://' + app.SERVER + ':' + app.PORT;
process.env.SERVER_PATH = app.SERVER_PATH;
console.log('SERVER_PATH = ' + app.SERVER_PATH);

// setup socket
require('./app/socket')(server);

// extend date object
require('./app/libs/date');

// setup scheduler
require('./app/scheduler');

// setup crawler
require('./app/crawler');

// routes
require('./app/routes')(app);

server.listen(app.PORT, function() {
  console.log('%s: Node server started on %s:%d ...', new Date(), app.SERVER, app.PORT);
});
