'use strict';

var socket = require('./../socket')(),
  logsModel = require('../models/logs');

const pushToClientEvery = 5000; // 5 seconds

function getLogs(client, force) {
  logsModel.get({
    entity: client.logsData.entity,
    action: client.logsData.action,
    stage: client.logsData.stage,
    gran: client.logsData.gran,
    page: client.logsData.page
  }, function(err, response) {
    if (!err && response) {
      // to prevent push duplicates
      socket.emit(client, 'logs', 'prevLogs', force, response);
      // but also we can push data to client by
      // client.emit('logs', response);
    }
  });
}

setInterval(function() {
  var clients = socket.getClients();
  clients.forEach(function(client) {
    if (client.dataType === 'logs') {
      getLogs(client);
    }
  });
}, pushToClientEvery);

socket.on('logs', function(data) {
  data = data || {};
  this.logsData = {
    entity: data.entity,
    action: data.action,
    stage: data.stage,
    gran: data.gran,
    page: data.page
  };
  this.dataType = 'logs';
  getLogs(this, true);
});
