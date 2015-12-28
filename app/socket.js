'use strict';

var io = require('socket.io'),
  crypto = require('crypto'),
  ioServer,
  clients = new Map(),
  events = new Map();

function compare(data) {
  var md5sum = crypto.createHash('md5');
  return md5sum.update(JSON.stringify(data)).digest('hex');
}

exports = module.exports = function(server) {
  if (!ioServer) {
    ioServer = io(server);
    ioServer.on('connection', function(client) {
      // store client
      clients.set(client.id, client);
      // subscribe client to exiting events
      events.forEach(function(handlers, key) {
        handlers.forEach(function(handler) {
          client.on(key, handler);
        });
      });
      client.on('disconnect', function() {
        clients.delete(client.id);
      });
    });
  }

  return {
    on: function(eventName, handler) {
      if (!events.has(eventName)) {
        events.set(eventName, new Map());
      }
      var event = events.get(eventName);
      event.set(handler, handler);
      // subscribe existing clients to new event
      clients.forEach(function(client) {
        client.on(eventName, handler);
      });
    },
    emit: function(client, eventName, field, force, data) { // send only unique data if "force" not defined
      if (client && eventName && data) {
        var md5sum = compare(data);
        if (md5sum !== client[field] || force) {
          client[field] = md5sum;
          client.emit(eventName, data);
        }
      } else {
        return false;
      }
    },
    off: function(eventName, handler) {
      var event = events.get(eventName);
      event.delete(handler);
      // unsubscribe existing clients
      clients.forEach(function(client) {
        client.removeListener(eventName, handler);
      });
    },
    getClients: function() {
      return clients;
    }
  };
};
