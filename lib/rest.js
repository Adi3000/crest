/**
 * Copyright 2013 Ricard Aspeljung. All Rights Reserved.
 *
 * rest.js
 * crest
 */

var MongoClient = require("mongodb").MongoClient,
  Db = require('mongodb').Db,
  BSON = require("mongodb").BSONPure,
  ObjectID = require("mongodb").ObjectID,
  server = module.parent.exports.server,
  config = module.parent.exports.config,
  debug = module.parent.exports.debug,
  express = module.parent.exports.express,
  dbPools = module.parent.exports.debug,
  util = require("./util").util;

debug("rest.js is loaded");

function getDb(dbName, operation){
    var dbExpires = Date.now()  - config.db.expireTime;
    if(typeof dbPools[dbName] === "undefined" || dbPools[dbName] === null 
        || !dbPools[dbName].lastOperation || dbExpires >  dbPools[dbName].lastOperation ){
      debug("Connecting to db", dbName);
      if( typeof dbPools[dbName] !== "undefined" && dbPools[dbName].lastOperation && dbExpires > dbPools[dbName].lastOperation ){
        debug("Try to close expired connection");
        dbPools[dbName].db.close();
        debug("Db closed");
      }
      MongoClient.connect(util.connectionURL(dbName, config), function (err, db) {
        if(err){
          console.log('Db open error: ' + err.message);
        }
        if(typeof db !== "undefined" && db){
          debug("Saving db pool", dbName);
          dbPools[dbName] = { db : db };
        }
        operation(err, dbPools[dbName].db);
        dbPools[dbName].lastOperation =  Date.now(); 
      });
    }else{
      debug("Using db pool", dbName);
      operation(null, dbPools[dbName].db);
      dbPools[dbName].lastOperation = Date.now();
    }
}
/**
 * Query
 */
function handleGet(req, res, next) {
  debug("GET-request recieved");
  var query,
    fields = {},
    sort = { "_id" : 1};
  // Providing an id overwrites giving a query in the URL
  if (req.params.id) {
    query = {
      '_id': new ObjectID(req.params.id)
    };
  } else {
    query = req.query.query ? util.parseJSON(req.query.query, next, express) : {};
  }
  var options = req.params.options || {};

  if (req.query.fields) {
    fields = util.parseJSON(req.query.fields, next);
  }
  if (req.query.sort) {
    sort = util.parseJSON(req.query.sort, next);
  }

  var test = ['limit', 'skip', 'hint', 'explain', 'snapshot', 'timeout'];
  
  var v;
  for (v in req.query) {
    if (test.indexOf(v) !== -1) {
      options[v] = req.query[v];
    }
  }
  /*if (!util.isEmpty(req.body)) {
   var body = req.body.split(",");
    if (body[0]) {
      query = util.parseJSON(body[0], next);
    }
    if (body[1]) {
      options = util.parseJSON(body[1], next);
    }
  }*/
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.set('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  getDb(req.params.db, function (err, db) {
    if (err) {
        console.log('Db open error: ' + err.message);
        res.status(500).send(err.message);
        return;
    }
    db.collection(req.params.collection, function (err, collection) {
      collection.find(query, fields, options, function (err, cursor) { 
          if (err) {
            console.log('Request error: ' + err.message);
            res.status(500).send(err.message);
            return;
          }
          if(sort !== null){
            cursor = cursor.sort(sort);
          }
          cursor.toArray(function (err, docs) {
            var result = [];
            if (req.params.id) {
              if (docs.length > 0) {
                result = util.flavorize(docs[0], "out");
                res.set('Content-Type', 'application/json; charset=utf-8');
                res.jsonp(result);
              } else {  
                res.status(404).send({ error: "Document with id " + req.params.id + " not found" });
              }
            } else {
              docs.forEach(function (doc) {
                result.push(util.flavorize(doc, "out"));
              });
              res.set('Content-Type', 'application/json; charset=utf-8');
              res.jsonp(result);
            }
        });
      });
    });
  });
}

server.get('/:db/:collection/:id?', handleGet);
server.get('/:db/:collection', handleGet);


/**
 * Insert
 */
server.post('/:db/:collection', function (req, res) {
  debug("POST-request recieved");
  if (req.params) {
    getDb(req.params.db, function (err, db) {
      debug("POST HERE");
      if (err) {
          console.log('Db open error: ' + err.message);
          res.status(500).send(err.message);
          return;
      }
      var collection = db.collection(req.params.collection);
      var documentToInsert = util.removePrefixes(Array.isArray(req.body) ? util.cleanParams(req.body[0]) : util.cleanParams(req.body));
      // We only support inserting one document at a time
      collection.insertOne(documentToInsert, function (err, docs) {
        res.header('Location', '/' + req.params.db + '/' + req.params.collection + '/' + docs.ops[0]._id.toHexString());
        res.header('DocumentId', docs.ops[0]._id.toHexString());
        res.set('Content-Type', 'application/json; charset=utf-8');
        res.status(201).jsonp(docs.result);
      });
    });
  } else {
    res.set('Content-Type', 'application/json; charset=utf-8');
    res.status(200).jsonp({"ok": 0});
  }
});

/**
 * Update
 */
server.put('/:db/:collection/:id', function (req, res) {
  debug("PUT-request recieved");
  var spec = {
    '_id': new ObjectID(req.params.id)
  };
  getDb(req.params.db, function (err, db) {
    if (err) {
        console.log('Db open error: ' + err.message);
        res.status(500).send(err.message);
        return;
    }
    db.collection(req.params.collection, function (err, collection) {
      var documentToUpdate =  util.removePrefixes(util.cleanParams(req.body));
      collection.updateOne(spec, documentToUpdate, true, function (err, docs) {
        res.set('Content-Type', 'application/json; charset=utf-8');
        res.jsonp(docs);
      });
    });
  });
});

/**
 * Delete
 */
server.delete('/:db/:collection/:id', function (req, res) {
  debug("DELETE-request recieved");
  var spec = {
    '_id': new ObjectID(req.params.id)
  };
  getDb(req.params.db, function (err, db) {
    if (err) {
        console.log('Db open error: ' + err.message);
        res.status(500).send(err.message);
        return;
    }
    db.collection(req.params.collection, function (err, collection) {
      collection.removeOne(spec, function (err, docs) {
        res.set('content-type', 'application/json; charset=utf-8');
        res.jsonp(docs);
      });
    });
  });
});
