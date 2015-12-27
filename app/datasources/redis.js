'use strict';

var _ = require('underscore'),
  async = require('async'),
  settings = require('../../settings'),
  log = require('../modules/log'),
  constants = require('../constants')(),
  redis = require('redis'),
  TimeSeries = require('../../libs/timeseries'),
  db_prefix = settings.REDIS_PREFIX,
  client,
  subscribeClient, // needed because: Once the client enters the subscribed state it is not supposed to issue any other commands, except for additional SUBSCRIBE, PSUBSCRIBE, UNSUBSCRIBE and PUNSUBSCRIBE commands.
  db_address = '127.0.0.1',
  db_password = process.env.REDIS_PASSWORD || '',
  db_port = 6379;

if (!client) {
  let dbConnected;

  client = redis.createClient(db_port, db_address);
  client.auth(db_password);

  client.on('error', function(err) {
    console.log('Redis ' + err);
    if (!dbConnected) {
      process.exit(1);
    }
  });
  client.on('ready', function() {
    dbConnected = true;
    console.log('Redis connected: %s:%d', db_address, db_port);
  });
}

if (!subscribeClient) {
  let dbConnected;

  subscribeClient = redis.createClient(db_port, db_address);
  subscribeClient.auth(db_password);

  subscribeClient.on('error', function(err) {
    console.log('Redis ' + err);
    if (!dbConnected) {
      process.exit(1);
    }
  });
  subscribeClient.on('ready', function() {
    dbConnected = true;
    console.log('Redis connected in SUBSCRIBE MODE to: %s:%d', db_address, db_port);
  });
}

function getMembersScores(members) {
  var scoresList = _.groupBy(members, function(a, b) {
      return Math.floor(b / 2);
    }),
    scores = {},
    names = [];
  _.each(scoresList, function(item) {
    scores[item[0]] = parseInt(item[1], 10);
    names.push(item[0]);
  });
  return {
    names: names,
    scores: scores
  };
}

function getMembers(topic, members, options, callback) {
  var opts = options || {},
    showAll = opts.per_page === 0,
    page = showAll ? 1 : (opts.page || 1),
    per_page = showAll ? 'all' : (opts.per_page || 20),
    total = opts.total,
    start = showAll ? 0 : (opts.start || 0),
    rank = start + 1,
    membersData = getMembersScores(members);

  client.hmget(db_prefix + topic, membersData.names, function(err, data) {
    var items = [],
      result = {};
    _.each(data, function(member) {
      var current = JSON.parse(member);
      if (current) {
        current.rank = rank;
        current.score = membersData.scores[current.id];
        items.push(current);
      }
      rank += 1;
    });
    result.page = page;
    result.per_page = per_page;
    result.total = total;
    result.count = items.length;
    result.items = items;
    if (callback) {
      callback(null, result);
    }
  });
}

// ----------------
// public functions
// ----------------

function multi(operations, callback) {
  var cb = callback || _.noop,
    multiHandler = client.multi();

  if (!_.isArray(operations)) {
    cb(constants.get('ARRAY_REQUIRED', 'operations'));
    return;
  }

  _.each(operations, function(oItem) {
    var operation = oItem.operation,
      topic = db_prefix + 'z:' + oItem.topic;

    switch (operation) {
      case 'zadd':
        multiHandler[operation](topic, oItem.score, oItem.id);
        break;
      case 'zrem':
      case 'zscore':
      case 'hdel':
        multiHandler[operation](topic, oItem.id);
        break;
      case 'del':
        multiHandler[operation](topic);
        break;
    }
  });
  multiHandler.exec(cb);
}

function hget(topic, id, callback) {
  var cb = callback || _.noop;
  if (topic && id) {
    client.hget(db_prefix + topic, id, function(err, reply) {
      cb(err, err ? reply : JSON.parse(reply));
    });
  } else {
    cb(true, null);
  }
}

function hset(topic, id, data, callback) {
  var cb = callback || _.noop;
  if (topic && id && data) {
    client.hset(db_prefix + topic, id, JSON.stringify(data), function(err, reply) {
      cb(err, reply);
    });
  } else {
    cb(true, null);
  }
}

function hgetall(topic, callback) {
  var cb = callback || _.noop;
  if (topic) {
    client.hgetall(db_prefix + topic, cb);
  } else {
    cb(true, null);
  }
}

function hpage(listtopic, datatopic, options, callback) {
  var cb = callback || noop,
    opts = options || {},
    showAll = opts.per_page === 0,
    start = showAll ? 0 : (opts.start || 0),
    end = showAll ? -1 : (opts.end !== undefined ? opts.end : 19),
    orderFunction = opts.ascending ? 'zrange' : 'zrevrange';

  if (listtopic && datatopic) {
    client.zcard(db_prefix + 'z:' + listtopic, function(err, total) {
      client[orderFunction](db_prefix + 'z:' + listtopic, start, end, 'withscores', function(err, members) {
        opts.total = parseInt(total, 10);
        getMembers(datatopic, members, opts, cb);
      });
    });
  } else {
    cb(true, null);
  }
}

function zrem(topic, id, callback) {
  var cb = callback || _.noop;
  client.zrem(db_prefix + 'z:' + topic, id, function(err) {
    cb(err);
  });
}

function zadd(topic, score, id, callback) {
  var cb = callback || _.noop;
  client.zadd(db_prefix + 'z:' + topic, score, id, function(err) {
    cb(err);
  });
}

function zall(topic, callback) {
  var cb = callback || _.noop;
  client.zrevrange(db_prefix + 'z:' + topic, 0, -1, cb);
}

function zremrange(topic, startscore, endscore, callback) {
  var cb = callback || _.noop;
  if (topic) {
    client.zremrangebyscore(db_prefix + 'z:' + topic, startscore || 0, endscore || 0, cb);
  } else {
    cb(true, null);
  }
}

function zscore(topic, id, callback) {
  var cb = callback || _.noop;
  if (topic && id) {
    client.zscore(db_prefix + 'z:' + topic, id, function(err, data) {
      cb(err, Number(data));
    });
  } else {
    cb(true, null);
  }
}

function zincrement(topic, id, increment, callback) {
  var cb = callback || _.noop;
  if (topic && id) {
    client.zincrby(db_prefix + 'z:' + topic, increment || 1, id, cb);
  } else {
    cb(true, null);
  }
}

function union(topics, metatopic, callback) {
  var cb = callback || _.noop,
    opts = {},
    tags = [],
    cmd,
    tmp = 'tmp:union:' + new Date().getTime();

  if (_.isArray(topics) && metatopic) {
    _.each(topics, function(topic) {
      tags.push(db_prefix + 'z:' + topic);
    });
    cmd = [db_prefix + tmp, tags.length].concat(tags);
    client.zunionstore(cmd, function(err, total) {
      if (err) {
        cb(err);
      } else {
        client.zrange(db_prefix + tmp, 0, -1, 'withscores', function(err, members) {
          opts.total = parseInt(total, 10);
          getMembers(metatopic, members, opts, cb);
          client.del(db_prefix + tmp);
        });
      }
    });
  } else {
    cb(true, null);
  }
}

function counter(key, callback) {
  var cb = callback || _.noop;
  client.incr(db_prefix + key, cb);
}

function setadd(key, value, callback) {
  var cb = callback || _.noop;
  if (key && value) {
    client.sadd(db_prefix + 's:' + key, value, cb);
  } else {
    cb(true, null);
  }
}

function setpop(key, callback) {
  var cb = callback || _.noop;
  if (key) {
    client.spop(db_prefix + 's:' + key, cb);
  } else {
    cb(true, null);
  }
}

function subscribe(channelName) {
  return channelName ? subscribeClient.subscribe(channelName) : null;
}

function on(event, callback) {
  var cb = callback || noop;
  if (event) {
    subscribeClient.on(event, cb);
  } else {
    cb(true, null);
  }
}

function publish(event, message, callback) {
  var cb = callback || noop;
  if (event && message) {
    client.publish(event, message, cb);
  } else {
    cb(true, null);
  }
}

function createTimeSeries(topic) {
  var result;
  if (!topic) {
    result = null;
  } else {
    result = new TimeSeries(client, db_prefix + topic);
  }
  return result;
}

function flushall(callback) {
  var cb = callback || _.noop;
  if (process.env.CURRENT_ENV !== 'TEST') {
    console.log('Can\'t flush `%` db. Flush operation available only for `TEST` environment.', process.env.CURRENT_ENV);
    cb(true);
  } else {
    client.keys(db_prefix + '*', function(err, keys) {
      async.eachSeries(keys, function(key, internalCallback) {
        client.del(key, internalCallback);
      }, function(err) {
        cb(err);
      });
    });
  }
}

// ---------
// interface
// ---------

exports = module.exports = {
  multi,
  hget,
  hset,
  hgetall,
  hpage,
  zadd,
  zrem,
  zall,
  zremrange,
  zscore,
  zincrement,
  union,
  counter,
  setadd,
  setpop,
  subscribe,
  on,
  publish,
  createTimeSeries,
  flushall
};
