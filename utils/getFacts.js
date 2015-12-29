'use strict';

var _ = require('underscore'),
  tomita = require('../app/modules/tomita');

exports = module.exports = function(options, callback) {
  var cb = callback || _.noop,
    opts = options || {},
    text = opts.text,
    gotFacts = [];

  if (!text) {
    text = `Террористическая группировка «Боко Харам» совершила 28 декабря серию терактов в Нигерии, в результате которых погибли по меньшей мере 80 человек, сообщает Associated Press.
Около 50 человек погибли и более 90 пострадали в городе Майдугури, где в ночь на понедельник произошла серия взрывов и нападений с использованием огнестрельного оружия, сообщили в в Национальном агентстве по чрезвычайным ситуациям.
В городе Мадагали в 150 километрах от Майдугури две смертницы устроили взрывы на рынке рядом с автобусной станцией. В результате погибли 30 человек.`;
  }

  console.log('Text: %s', text);

  tomita.getFacts(text, function(err, response) {
    if (err) {
      cb(err);
    } else if (!response || !response.Fact || !_.size(response.Fact)) {
      cb('No facts');
    } else {
      var extractFact = function(fact) {
        var factField = fact.Field1;
        if (factField) {
          fact = factField.$.val;
          gotFacts.push(fact.toLowerCase());
        }
      };
      if (_.isArray(response.Fact)) {
        _.each(response.Fact, function(fact) {
          extractFact(fact);
        });
      } else if (_.isObject(response.Fact)) {
        extractFact(response.Fact);
      }

      console.log(gotFacts);
      cb();
    }
  });
};
