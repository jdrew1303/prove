'use strict';

var _ = require('underscore'),
  dictionary = {
    DATABASE_ERROR: 'Database operation has failed',
    REQUIRED: '`%s` parameter is required',
    STRING_REQUIRED: '`%s` should be a not empty string',
    NUMBER_REQUIRED: '`%s` should be a number',
    EMAIL_REQUIRED: '`%s` should be an email string like `name@address.com`',
    ARRAY_REQUIRED: '`%s` should be an array',
    OBJECT_REQUIRED: '`%s` should be an object',
    DATE_REQUIRED: '`%s` should be a date',
    FUNCTION_REQUIRED: '`%s` should be a function',
    ONE_REQUIRED: 'You need to specify `%s1`',
    VALIDATOR_WRONG_OPTIONS_FORMAT: 'Validator wrong options format in `%s`',
    GREATER_THAN_ZERO_REQUIRED: '`%s` should be greater than 0'
  },
  current,
  dictionaryActions = {};

const Parser = class {
  constructor(name) {
    this.name = name;
    return ((params) => this.action(params));
  }
  action(param) {
    if (_.isArray(param)) {
      var result = dictionary[this.name];
      _.each(param, function(str, index) {
        result = result.replace('%s' + (index + 1), str);
      });
      return result;
    }
    return dictionary[this.name].replace('%s', param);
  }
};

exports = module.exports = function() {
  if (!current) {
    _.each(dictionary, function(value, key) {
      dictionaryActions[key] = new Parser(key);
    });
    dictionaryActions.dictionary = dictionary;
  }
  return dictionaryActions;
};
