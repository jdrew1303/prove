'use strict';

var _ = require('underscore'),
  tomita = require('../app/modules/tomita');

exports = module.exports = function(options, callback) {
  var cb = callback || _.noop,
    opts = options || {},
    text = opts.text,
    gotFacts = {};

  if (!text) {
    text = `Владимир Чуров не исключает своей отставки

    Алма-Атинская ул.

    г. Санкт-Петербург. проспекте Гагарина. В США и Тунисе нашли черепаху

    У Enterprise Edition будет более основательный дизайн, который защитит устройство от воздействия воды, пыли, осколков и других мелких частиц. Кроме того, новое устройство будет складываться.

    В Google Glass Enterprise Edition добавлен процессор Intel Atom, улучшенная батарея, а также более мощный приемник беспроводной связи. К устройству также прилагается внешняя батарея, которая крепится к очкам на магните.`;
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
