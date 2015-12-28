'use strict';

import * as _ from 'underscore';

var events = [
  'ready'
];

var _evs = events;
events = {};
_.each(_evs, function(event) {
  events[event] = {
    handlers: new Map()
  };
});
_evs = null;

var checkEventExists = function(eventName) {
  if (_.contains(_.keys(events), eventName)) {
    return true;
  } else {
    throw new Error(`EventManager event ${eventName} not found`);
  }
};

// ----------------
// public methods
// ----------------

var pOn = function(eventName, handler) {
  eventName = eventName.split(' ');
  _.each(eventName, function(item) {
    if (checkEventExists(item)) {
      events[item].handlers.set(handler, handler);
    }
  });
};

var pOff = function(eventName, handler) {
  eventName = eventName.split(' ');
  _.each(eventName, function(item) {
    if (checkEventExists(item)) {
      events[item].handlers.delete(handler);
    }
  });
};

var pEmit = function(eventName, values) {
  if (checkEventExists(eventName)) {
    console.log(`'${eventName}' event is emitted`);
    events[eventName].handlers.forEach(function(handler) {
      if (!values) {
        values = {
          name: eventName
        };
      }
      handler(values);
    });
  }
};

var pFlushEvents = function() {
  _.each(events, function(eventName, key) {
    events[key].handlers = new Map();
  });
};

// ---------
// interface
// ---------

export {
  pOn as on,
  pOff as off,
  pEmit as emit,
  pFlushEvents as flushEvents
};
