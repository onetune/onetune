var itunes = require('../config/itunes');
var mongo 	= require('mongoskin');
var config 	= require('../config.json')
var _ = require('underscore');
var	connection  = mongo.db('jonny:' + config.password + '@' + config.database + ':27017/chinchilla', {safe: true})
var childProcess = require('child_process');

connection.collection('artists').find({}, {limit: 100}).toArray(function (err, items) {
	var ids = _.pluck(items, 'id')
	_.each(ids, function (id, key) {
		setTimeout(function() {
			childProcess.exec('curl --max-time 20 --connect-timeout 10 -iSs "' + 'https://itunes.apple.com/lookup?country=us&entity=song&id='+id + '"', function (error, stdout, stderr) {
				i++;
				var body = stdout.substr(stdout.indexOf('\n\n\n\n'));
				var data = JSON.parse(body);
				if (data && data.resultCount) {
					console.log(i + ': Total success. ' + data.resultCount + ' songs fetched');
				}
				else {
					console.log('Failed request');
				}
			});
		}, 200*key);
	});
});

var i = 0;
var afterAllArtistTracks = function (data) {
	i++;
	if (data && data.resultCount) {
		console.log(i + ': Total success. ' + data.resultCount + ' songs fetched.');
	}
	else {
		console.log('Failed request');
	}
}

