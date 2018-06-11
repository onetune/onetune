/*
	Run with: node fix_album_names.js

	Does not give feedback

	Fixes Album names that are integers
*/

var mongo       = require("mongoskin"),
	_           = require("underscore"),
	connection  = mongo.db('jonny:' + 'insert_pw_here' + '@' + 'insert_db_here' + ':' + 'insert_port_here' + '/chinchilla', {safe: true})


connection.collection('albums').find({$where: 'typeof this.name != "string"'}).toArray(function (err, items) {
	_.each(items, function(item) {
		item.name = item.name +''
		connection.collection('albums').update({id: item.id}, item, {}, function () {

		});
	});
});
