/*
	Run with: node reset_colors.js

	Does give feedback

	Reverts colors of playlist headers
*/

var mongo       = require("mongoskin"),
	_           = require("underscore"),
	async		= require("async"),
	connection  = mongo.db('jonny:' + 'pw' + '@' + 'db' + ':' + 'port' + '/chinchilla', {safe: true})


connection.collection('playlists').find({$where: 'this.style != undefined'}).toArray(function (err, items) {
	console.log(err)
	async.each(items, function (item, callback) {
		delete item.style;
		connection.collection('playlists').update({url: item.url}, item, {}, function () {
			console.log('Playlist ' + item.url + ' updated');
			callback();
		});
	});
});