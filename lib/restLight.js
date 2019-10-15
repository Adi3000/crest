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

debug("restLight.js is loaded");
function getDb(dbName, operation){
	if(typeof dbPools[dbName] === "undefined"){
		debug("Connecting to db", dbName);
		MongoClient.connect(util.connectionURL(dbName, config), function (err, db) {
			if(err){
				console.log('Db open error: ' , err);
			}
			if(typeof db !== "undefined" && db){
				debug("Saving db pool", dbName);
				dbPools[dbName] = { db : db };
			}
			operation(err, dbPools[dbName].db);
		});
	}else{
		operation(null, dbPools[dbName].db);
	}
}
if(config.db.dbList){
	console.log("DbName", config.db.dbList)
	for(var dbName in config.db.dbList){
		console.log("DbName", dbName);
		getDb(config.db.dbList[dbName], function (err, db) {});
	}
}

/**
 * Query
 */
function handleGet(req, res, next) {
	var query = {  '_id': new ObjectID(req.params.id) };
	getDb(req.params.db, function (err, db) {
			if (err) {
				console.log('Db open error: ', err);
				res.status(500).send(err.message);
				return;
			}
			db.collection(req.params.collection, function (err, collection) {
			collection.findOne(query, {},  {}, function (err, docs) {
				res.jsonp(docs);
			});
		});
	});
}

server.get('/:db/:collection/:id', handleGet);
