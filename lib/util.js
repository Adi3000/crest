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
      if (config.db.username && config.db.password) {
        auth = config.db.username + ":" + config.db.password + "@";
      }
      return "mongodb://" + auth + config.db.host + ":" + config.db.port + "/" + dbName; // + "?maxPoolSize=20";
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
      dst = {},
      strippedKey = "";
  
    if (!(typeof src === 'object')){
      return src; //non object are pure data
    } 
    for (var key in src) {
      if (key[0] === '$') return src; //specific fields updates are not concerned
      if (prefix === undefined) {
        var pieces = key.split(':');
        if (pieces.length === 2) {
          if (pieces[0] === '@xmlns' || pieces[0] === 'xmlns') {
            prefix = pieces[1];
          } else {
            prefix = pieces[0];
          }
        } else {
          prefix = "";
        }
      }
      debugger  ;
      strippedKey = this.stripKey(key, prefix);
      dst[strippedKey] = this.removePrefixes(src[key], prefix);
    }
    return dst;
  }
};