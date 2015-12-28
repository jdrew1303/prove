'use strict';

var connect;

function init() {
  if (!connect) {
    var ENV = process.env.CURRENT_ENV,
      address = 'http://localhost:8081';

    if (ENV === 'PROD') {
      address = '';
    }

    connect = io(address);
  }
  
  return {
    on: function(eventName, handler) {
      if (eventName && handler) {
        connect.on(eventName, handler);
      } else {
        return false;
      }
    },
    emit: function(eventName, data) {
      if (eventName && data) {
        connect.emit(eventName, data);
      } else {
        return false;
      }
    },
    off: function(eventName, handler) {
      if (eventName && handler) {
        connect.removeListener(eventName, handler);
      } else {
        return false;
      }
    }
  };
}

export default init();
