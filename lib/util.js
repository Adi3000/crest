/**
 * Copyright 2013 Ricard Aspeljung. All Rights Reserved.
 *
 * util.js
 * crest
 */

var mongo = require("mongodb"),
  config = module.parent.parent.exports.config,
  debug = module.parent.parent.exports.debug;

debug("util.js is loaded");
module.exports.util = {
  isEmpty : function(obj) {

    // null and undefined are "empty"
    if (obj == null) return true;

    // Assume if it has a length property with a non-zero value
    // that that property is correct.
    if (obj.length > 0)    return false;
    if (obj.length === 0)  return true;

    // Otherwise, does it have any properties of its own?
    // Note that this doesn't handle
    // toString and valueOf enumeration bugs in IE < 9
    for (var key in obj) {
        if (hasOwnProperty.call(obj, key)) return false;
    }

    return true;
  },
  /*
   * flavorize - Changes JSON based on flavor in configuration
   */
  flavorize: function (doc, direction) {
    if (direction === "in") {
      if (config.flavor === "normal") {
        delete doc.id;
      }
    } else {
      if (config.flavor === "normal") {
        var id = doc._id.toHexString();
        delete doc._id;
        doc.id = id;
      } else {
        doc._id = doc._id.toHexString();
      }
    }
    return doc;
  },
  cleanParams: function (params) {
    var clean = JSON.parse(JSON.stringify(params));
    if (clean.id) {
      delete clean.id;
    }
    if (clean.db) {
      delete clean.db;
    }
    if (clean.collection) {
      delete clean.collection;
    }
    return clean;
  },
  parseJSON: function (data, next, restify) {
    var json;
    try{
      json = JSON.parse(data);
    } catch (e) {
      return next(new restify.InvalidArgumentError("Not valid JSON data."));
    }
    return json;
  },
  connectionURL: function (dbName, config){
      var auth = "";
      var options = "";
      if (config.db.username && config.db.password) {
        auth = config.db.username + ":" + config.db.password + "@";
      }
      if(config.db.mongoUrlOptions){
        options= "?" + config.db.mongoUrlOptions;
      }
      return "mongodb://" + auth + config.db.host + "/" + dbName + options;
  },
  stripKey : function(key, pfx) {
    var strippedKey = key;
    var pre = new RegExp("^" + pfx + ":",'i'),
      post = new RegExp(":" + pfx + "$",'i');
    strippedKey = strippedKey.replace(pre,'');
    strippedKey = strippedKey.replace(post,'');
    return strippedKey;
  },
  removePrefixes : function(src, pfx) {
    var prefix = pfx,
      dst = null,
      prefixes = [],
      strippedKey = "";
    if (!(typeof src === 'object')){
      return src; //non object are pure data
    } 
    dst = (Array.isArray(src)) ? [] : {};

    for (var key in src) {
      strippedKey = this.stripKey(key, prefix);
      if(key === strippedKey){
        var pieces = key.split(':'),
            prefix2 =null;
        if (pieces.length === 2) {
          if (pieces[0] === '@xmlns' || pieces[0] === 'xmlns') {
            prefix2 = pieces[1];
          } else {
            prefix2 = pieces[0];
          }
        } else {
          prefix2 = "";
        }
        strippedKey = this.stripKey(key, prefix2);
        dst[strippedKey] = this.removePrefixes(src[key], prefix2);
      }else{
        dst[strippedKey] = this.removePrefixes(src[key], prefix);
      }
    }
    return dst;
  }
};