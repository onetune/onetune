var itunes = require('./itunes'),
	async = require('async'),
	_ = require('underscore'),
	db = require('../db/queries');
var YouTube = require('youtube-node');
var youtube = new YouTube();
youtube.setKey(process.env.YOUTUBE_KEY);
exports.getTracksFromItunesandYouTube = function (ids, _callback) {
	if (!_.isArray(ids)) return;
	var valid 			= new RegExp('^[a-zA-Z0-9_-]+$'),
		itunes_regex 	= new RegExp('^[0-9]+$');

	var valid_ids = _.reject(ids, function (id) { return !valid.test(id) });
	var providers = _.groupBy(ids, function (id) { return itunes_regex.test(id) ? 'itunes' : 'youtube' });
	async.parallel([
		function (callback) {
			if (!providers.itunes) { callback(null, []); return; }
			itunes.getFromItunes(providers.itunes, function (tracks) {
				callback(null, tracks);
			});
		},
		function (callback) {
			if (!providers.youtube) { callback(null,[]); return; }
			async.each(providers.youtube, function (id, cb) {
				youtube.getById(id, function (error, response) {
					var video = response.items[0];
					if (!video) {
						cb(null);
						return;
					}
					cb(itunes.remapYouTubeNew(video))
				});
			}, function (trx) {
				callback(null, trx)
			});
		}
	],
	function (err, results) {
		_callback(_.chain(results).flatten().compact().value());
	});
}
exports.getTracksFromAllSources = function(ids, _callback) {
	if (!_.isArray(ids)) {
		console.log('No array passed.');
		return;
	};
	var valid = new RegExp('^[a-zA-Z0-9_-]+$');
	var valid_ids = _.reject(ids, function (id) { return !valid.test(id) });

	db.getSongsByIdList(ids, function (tracks) {
		var received_ids = _.pluck(tracks, 'id');
		var notreceived = _.reject(ids, function (id) { return _.contains(received_ids, id) })
		if (notreceived.length == 0) {
			_callback(tracks);
		}
		else {
			exports.getTracksFromItunesandYouTube(notreceived, function (service_tracks) {
				var concatenated_tracks = tracks.concat(service_tracks);
				_callback(concatenated_tracks);
			});
		}
	});
}
