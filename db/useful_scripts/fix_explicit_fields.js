/*
	Run with: node fix_explicit_fields.js

	Does not give feedback

	Fixes Album names that are integers
*/

var mongo       = require("mongoskin"),
	_           = require("underscore"),
	connection  = mongo.db('jonny:' + 'enter_username_here' + '@' + 'enter_db_herr' + ':' + 'enter_port_here' + '/chinchilla', {safe: true})


connection.collection('tracks').find({$where: 'typeof this.name != "string"'}).toArray(function (err, items) {
	_.each(items, function(item) {
		item.name = item.name +''
		connection.collection('albums').update({id: item.id}, item, {}, function () {

		});
	});
});
