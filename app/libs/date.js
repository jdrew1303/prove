'use strict';

var moment = require('moment-timezone'),
  settings = require('../../settings') || {},
  timezone = process.env.TIMEZONE || settings.TIMEZONE;

var getYYYY = function(date, suffix) {
  return date['get' + suffix + 'FullYear']().toString();
};

var getYYYYMM = function(date, suffix) {
  suffix = suffix || '';
  var yyyy = getYYYY(date, suffix),
    mm = (date['get' + suffix + 'Month']() + 1).toString(); // getMonth() is zero-based
  return yyyy + (mm[1] ? mm : '0' + mm[0]);
};

var getYYYYMMDD = function(date, suffix) {
  suffix = suffix || '';
  var yyyymm = getYYYYMM(date, suffix),
    dd = date['get' + suffix + 'Date']().toString();
  return yyyymm + (dd[1] ? dd : '0' + dd[0]);
};

var getYYYYMMDDHHMMSS = function(date, suffix) {
  suffix = suffix || '';
  var yyyymmdd = getYYYYMMDD(date, suffix),
    hh = date['get' + suffix + 'Hours']().toString(),
    mm = date['get' + suffix + 'Minutes']().toString(),
    ss = date['get' + suffix + 'Seconds']().toString();
  return yyyymmdd + (hh[1] ? hh : '0' + hh[0]) + (mm[1] ? mm : '0' + mm[0]) + (ss[1] ? ss : '0' + ss[0]);
};

var getYYYYMMDDHHMMSSMS = function(date, suffix) {
  suffix = suffix || '';
  var yyyymmddhhmmss = getYYYYMMDDHHMMSS(date, suffix),
    ms = date['get' + suffix + 'Milliseconds']().toString();
  return yyyymmddhhmmss + ms;
};

// ---------------------------
// timezone specific functions
// ---------------------------

Date.prototype.updateTZ = function(TZ) {
  timezone = TZ;
};

Date.prototype.getTZDate = function() {
  return moment(this).tz(timezone).date();
};

Date.prototype.getTZDay = function() {
  return moment(this).tz(timezone).day();
};

Date.prototype.getTZFullYear = function() {
  return moment(this).tz(timezone).year();
};

Date.prototype.getTZHours = function() {
  return moment(this).tz(timezone).hours();
};

Date.prototype.getTZMilliseconds = function() {
  return moment(this).tz(timezone).milliseconds();
};

Date.prototype.getTZMinutes = function() {
  return moment(this).tz(timezone).minutes();
};

Date.prototype.getTZMonth = function() {
  return moment(this).tz(timezone).month();
};

Date.prototype.getTZSeconds = function() {
  return moment(this).tz(timezone).seconds();
};

Date.prototype.toTZString = function() {
  return moment(this).tz(timezone).format();
};

Date.prototype.yyyymmddhhmmssmsTZ = function() {
  return getYYYYMMDDHHMMSSMS(this, 'TZ');
};

Date.prototype.yyyymmddhhmmssTZ = function() {
  return getYYYYMMDDHHMMSS(this, 'TZ');
};

Date.prototype.yyyymmddTZ = function() {
  return getYYYYMMDD(this, 'TZ');
};

Date.prototype.yyyymmTZ = function() {
  return getYYYYMM(this, 'TZ');
};

Date.prototype.yyyyTZ = function() {
  return getYYYY(this, 'TZ');
};

// ---------------------------------
// ENDOF timezone specific functions
// ---------------------------------

// ----------------------
// UTC specific functions
// ----------------------

Date.prototype.yyyymmddhhmmssmsUTC = function() {
  return getYYYYMMDDHHMMSSMS(this, 'UTC');
};

Date.prototype.yyyymmddhhmmssUTC = function() {
  return getYYYYMMDDHHMMSS(this, 'UTC');
};

Date.prototype.yyyymmddUTC = function() {
  return getYYYYMMDD(this, 'UTC');
};

Date.prototype.yyyymmUTC = function() {
  return getYYYYMM(this, 'UTC');
};

Date.prototype.yyyyUTC = function() {
  return getYYYY(this, 'UTC');
};

// ----------------------------
// ENDOF UTC specific functions
// ----------------------------

// -----------------------------------
// current timezone specific functions
// -----------------------------------

Date.prototype.yyyymmddhhmmssms = function() {
  return getYYYYMMDDHHMMSSMS(this);
};

Date.prototype.yyyymmddhhmmss = function() {
  return getYYYYMMDDHHMMSS(this);
};

Date.prototype.yyyymmdd = function() {
  return getYYYYMMDD(this);
};

Date.prototype.yyyymm = function() {
  return getYYYYMM(this);
};

Date.prototype.yyyy = function() {
  return getYYYY(this);
};

// -----------------------------------------
// ENDOF current timezone specific functions
// -----------------------------------------
