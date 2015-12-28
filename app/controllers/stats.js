'use strict';

var _ = require('underscore'),
  socket = require('./../socket')(),
  statsModel = require('../models/stats')(),
  settings = require('../../settings');

const pushToClientEvery = 5000; // 5 seconds

function getStats(client, force) {
  var channels = [];
  _.each(settings.JOBS[client.statsData.entity], function(item) {
    _.each(item, function(channel) {
      if (channel.indexOf('queue:hits') === 0) {
        channels.push(channel);
      }
    });
  });
  statsModel.get({
    env: client.statsData.env,
    channels: channels
  }, function(err, response) {
    if (!err && response) {
      // to prevent push duplicates
      socket.emit(client, 'stats', 'prevStats', force, response);
      // but also we can push data to client by
      // client.emit('stats', response);
    }
  });
}

setInterval(function() {
  var clients = socket.getClients();
  clients.forEach(function(client) {
    if (client.dataType === 'stats') {
      getStats(client);
    }
  });
}, pushToClientEvery);

socket.on('stats', function(data) {
  data = data || {};
  this.statsData = {
    env: data.env,
    entity: data.entity
  };
  this.dataType = 'stats';
  getStats(this, true);
});
