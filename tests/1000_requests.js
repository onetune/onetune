var request = require('request')
var mongo 	= require('mongoskin')
var config 	= require('../config.json')
var _ 		= require('underscore')
var	connection  = mongo.db('jonny:' + config.password + '@' + config.database + ':27017/chinchilla', {safe: true})


var requests = 1000;
var successfulrequests = []
var failed_requests = []
var responsetimes = []
connection.collection('tracks').find({}, {limit: requests}).toArray(function(err, items) {
	if (!err) {
		var artists = _.pluck(items, 'artistid');
		_.each(artists, function (id, key) {
			setTimeout(function() {
				var date = Date.now();
				var url = 'https://onetune.fm/api/artist/' + id
				request(url, function(err, response, body) {
					if (err || response.statusCode != 200) {
						console.log('Failed request');
						failed_requests.push(response);
					}
					if (response.statusCode == 200) {
						console.log(key + ' Successful request ' + url);
						responsetimes.push(Date.now() - date);
						successfulrequests.push(response);
					}
					if (body.indexOf('Whooops') != -1) {
						console.log('whoops message');
					}
					if (key == artists.length-1) {
						setTimeout(function() {
							var fs = require('fs');
							var report = 	'Total requests: ' + artists.length + '\n' + 
											'Successful requests: ' + successfulrequests.length + '\n' + 
											'Failed requests: ' + failed_requests.length + '\n' + 
											'List of failed requests: \n' + 
											JSON.stringify(failed_requests) + '\n' +
											'Response times: ' + JSON.stringify(responsetimes) + '\n' + 
											'Average response time: ' + _.reduce(responsetimes, function (memo, num) {return memo + num;}, 0)/responsetimes.length; 
							fs.writeFile('reports/' + artists.length + '_requests.txt', report, function (err) {
								if (err) {
									console.log('Can\'t write report', err);
								}
								else {
									console.log('Report was saved.');
								}
							})
						}, 5000)
					}
				});
			}, 200*key)
		})
	}
});
