/**
 * Copyright 2013 Ricard Aspeljung. All Rights Reserved.
 *
 * rest.js
 * crest
 */

var MongoClient = require("mongodb").MongoClient,
  BSON = require("mongodb").BSONPure,
  ObjectID = require("mongodb").ObjectID,
  server = module.parent.exports.server,
  config = module.parent.exports.config,
  debug = module.parent.exports.debug,
  express = module.parent.exports.express,
  util = require("./util").util;

debug("rest.js is loaded");


/**
 * Query
 */
function handleGet(req, res, next) {
  debug("GET-request recieved");
  var query;
  var fields = {};
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

  var test = ['limit', 'sort', 'skip', 'hint', 'explain', 'snapshot', 'timeout'];
  
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

  MongoClient.connect(util.connectionURL(req.params.db, config), function (err, db) {
    db.collection(req.params.collection, function (err, collection) {
      collection.find(query, fields, options, function (err, cursor) {
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
          db.close();
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
    MongoClient.connect(util.connectionURL(req.params.db, config), function (err, db) {
      var collection = db.collection(req.params.collection);
      var documentToInsert = util.removePrefixes(Array.isArray(req.body) ? util.cleanParams(req.body[0]) : util.cleanParams(req.body));
      // We only support inserting one document at a time
      collection.insertOne(documentToInsert, function (err, docs) {
        res.header('Location', '/' + req.params.db + '/' + req.params.collection + '/' + docs.ops[0]._id.toHexString());
        res.header('DocumentId', docs.ops[0]._id.toHexString());
        res.set('Content-Type', 'application/json; charset=utf-8');
        res.status(201).jsonp(docs.result);
        db.close();
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
  MongoClient.connect(util.connectionURL(req.params.db, config), function (err, db) {
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
  MongoClient.connect(util.connectionURL(req.params.db, config), function (err, db) {
    db.collection(req.params.collection, function (err, collection) {
      collection.removeOne(spec, function (err, docs) {
        res.set('content-type', 'application/json; charset=utf-8');
        res.jsonp(docs);
        db.close();
      });
    });
  });
});
