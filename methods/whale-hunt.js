/*
  
  This method uses `Exponential Moving Average crossovers` to determine the current trend the
  market is in. Using this information it will suggest to ride the trend. Note that this is
  not MACD because it just checks whether the longEMA and shortEMA are [threshold]% removed
  from eachother.

  @link http://en.wikipedia.org/wiki/Exponential_moving_average#Exponential_moving_average

  This method is fairly popular in bitcoin trading due to Bitcointalk user Goomboo.

  @link https://bitcointalk.org/index.php?topic=60501.0
 */

// helpers
var moment = require('moment');
var _ = require('underscore');
var util = require('../util.js');
var Util = require('util');
var log = require('../log.js');

var config = util.getConfig();
var settings = config.whale;

var TradingMethod = function(watcher) {
  this.watcher = watcher;
  this.amount = settings.ticks + 1;
  // store Whale Hunting settings
  this.settings = settings;
  // store whole config
  this.config = config;

  _.bindAll(this);

  this.on('prepare', this.prepare);
  this.on('prepared', this.start);
  this.on('calculated candle', this.calculateExtreams);
}

var CandleMethod = require('./realtime-candle-fetcher.js');
Util.inherits(TradingMethod, CandleMethod);

// first prepare this trading method, then
// prepare the candleMethod this trade method 
// is extending.
TradingMethod.prototype.prepare = function() {
  log.info('Calculating maximum prices...');
  // setup method specific parameters
  this.prices = {
    high: [],
    low: []
  };
  this.highDiff = 0;
  this.lowDiff = 0;
  this.currentTrend;
  this.set();
}

TradingMethod.prototype.start = function() {
  this.getHistoricalCandles();
  setInterval(this.getNewCandle, util.minToMs( settings.interval ) );
}

// add a price and calculate the EMAs and
// the diff for that price
TradingMethod.prototype.calculateExtreams = function() {
  this.calculateExtream('high');
  this.calculateExtream('low');
  this.calculateExtreamDiff();

  // log.debug('calced EMA properties for new candle:');
  // _.each(['short', 'long', 'diff'], function(e) {
  //   log.debug('\t', e, 'ema', _.last(this.ema[e]).toFixed(3));
  // }, this);

  this.advice();
}

//    calculation (based on tick/day):
//  EMA = Price(t) * k + EMA(y) * (1 – k)
//  t = today, y = yesterday, N = number of days in EMA, k = 2 / (N+1)
TradingMethod.prototype.calculateExtream = function(type) {
  var price = _.last(this.candles[type]);
  extreame = price;
  this.prices[type].push(extreame);
}

// @link https://github.com/virtimus/GoxTradingBot/blob/85a67d27b856949cf27440ae77a56d4a83e0bfbe/background.js#L145
TradingMethod.prototype.calculateExtreamDiff = function() {
  var highExtream = _.max(this.prices.high);
  var lowExtream  = _.min(this.prices.low);
  var latestPrice = _.last(this.candles.close);
  this.highDiff   = latestPrice - highExtream;
  this.lowDiff    = latestPrice - lowExtream;
}

TradingMethod.prototype.advice = function() {
  var highDiff = this.highDiff.toFixed(3);
  var lowDiff  = this.lowDiff.toFixed(3);
  var price = _.last(this.candles.close).toFixed(3);
  var message = '@ ' + price + ' (UP:' + lowDiff + ', DOWN:' + highDiff + ')';
  if(lowDiff > settings.buyTreshold) {
    log.debug('There she blows!  (UP:' + lowDiff + ')');

    message = '@ ' + price + ' (' + lowDiff + ')';
    if(this.currentTrend !== 'up') {
      this.currentTrend = 'up';
      this.emit('advice', 'BUY', price, message);
    } else
      this.emit('advice', 'HOLD', price, message);

  } else if(highDiff < settings.sellTreshold) {
    log.debug('There she blows!  (DOWN:' + highDiff + ')');
    message = '@ ' + price + ' (' + highDiff + ')';
    if(this.currentTrend !== 'down') {
      this.currentTrend = 'down';
      this.emit('advice', 'SELL', price, message);
    } else
      this.emit('advice', 'HOLD', price, message);

  } else {
    log.debug('we are currently not in an up or down trend', message);
    this.emit('advice', 'HOLD', price, message);
  }
}

TradingMethod.prototype.refresh = function() {
  log.debug('refreshing');

  // remove the oldest tick
  this.ticks.splice(0, 1);

  // get new tick
  this.callback = this.advice;
  this.getTicks();
}

module.exports = TradingMethod;