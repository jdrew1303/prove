'use strict';

var _ = require('underscore'),
  tomita = require('../app/modules/tomita');

exports = module.exports = function(options, callback) {
  var cb = callback || _.noop,
    opts = options || {},
    text = opts.text,
    gotFacts = {};

  if (!text) {
    text = `Террористическая группировка «Боко Харам», адрес которой распологается на по адресу: г Москва, ул. 1-я Владимирская, д. 18, совершила 28 декабря серию терактов в Нигерии. А также ул Нижняя Масловка, д. 10, стр Б.

    Алма-Атинская ул.

    г. Санкт-Петербург. проспекте Гагарина. В США и Тунисе нашли черепаху`;
  }

  console.log('Text: %s', text);

  tomita.getFacts(text, function(err, response) {
    if (err) {
      cb(err);
    } else if (!response) {
      cb('No facts');
    } else {
      var extractFact = function(fact, factType) {
        _.each(fact, function(item, name) {
          if (name !== '$') {
            let val = item.$.val;
            if (!gotFacts[factType]) {
              gotFacts[factType] = [];
            }
            gotFacts[factType].push(val.toLowerCase());
          }
        });
      };
      _.each(response, function(facts, factType) {
        if (_.isArray(facts)) {
          _.each(facts, function(fact) {
            extractFact(fact, factType);
          });
        } else if (_.isObject(facts)) {
          extractFact(facts, factType);
        }
      });

      console.log(gotFacts);
      cb();
    }
  });
};
