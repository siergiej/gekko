var moment = require('moment');
var _ = require('underscore');

var _config = false;

// helper functions
var util = {
  getConfig: function() {
    if(_config)
      return _config;

    var path = require('path');
    var configFile = path.resolve(util.getArgument('config') || 'config.js');
    _config = require(configFile);
    return _config;
  },
  // overwrite the whole config
  setConfig: function(config) {
    _config = config;
  },
  setConfigProperty: function(parent, key, value) {
    if(parent)
      _config[parent][key] = value;
    else
      _config[key] = value;
  },
  getArgument: function(argument) {
    var ret;
    _.each(process.argv, function(arg) {
      var pos = arg.indexOf(argument + '=');
      if(pos !== -1) {
        ret = arg.substr(argument.length + 1);
      }
    });
    return ret;
  },
  minToMs: function(min) {
    return min * 60 * 1000;
  },
  toMicro: function(moment) {
    return moment.format('X') * 1000 * 1000;
  },
  intervalsAgo: function(amount) {
    return moment().subtract('minutes', config.whale.interval * amount);
  },
  average: function(list) {
    var total = _.reduce(list, function(m, n) { return m + n }, 0);
    return total / list.length;
  },
  // calculate the average trade price out of a sample of trades.
  // The sample consists of all trades that happened after the treshold.
  calculatePriceSince: function(treshold, trades) {
    var sample = [];
    _.every(trades, function(trade) {
      if(moment.unix(trade.date) < treshold)
        return false;

      var price = parseFloat(trade.price);
      sample.push(price);
      return true;
    });

    return util.average(sample);
  },
  // calculate the average trade price out of a sample of trades.
  // The sample consists of all trades that happened before the treshold.
  calculatePriceTill: function(treshold, trades) {
    var sample = [];
    _.every(trades, function(trade) {
      if(moment.unix(trade.date) > treshold)
        return false;

      var price = parseFloat(trade.price);
      sample.push(price);
      return true;
    });

    return util.average(sample);
  }
}

var config = util.getConfig();

module.exports = util;