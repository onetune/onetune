/*
	load the module that allows you to request JSON.
*/
var json    = require("jsonreq"),
	_       = require("underscore"),
	itunes  = require("../config/itunes"),
	db      = require("../db/queries"),
	workers = require("../config/workers"),
	standard= require("../config/standards"),
    charts  = this


exports.genres_ids = {

}
exports.genres = {

}
this.getAllGenres = () =>  {
	workers.getSubsAsync((subs) => {
		if (subs.length == 0) {
			setTimeout(this.getAllGenres, 1000);
		}
		else {
			var subs = _.reject(subs, function (sub) { return !sub.itunes })
			_.each(subs, function (sub) {
				exports.getGenreCharts(sub.itunes);
			});
		}
	});
}
exports.getGenreCharts = function (feed, callback) {
	var afterDBQuery = function(items) {
		if (items.length < 100) {
			notAllTracksInDB(items);
		}
		else {
			AllTracksInDB(items);
		}
	},
	notAllTracksInDB = function(items) {
		tracksInDB = _.pluck(items, 'id');
		var tofetch = _.reject(exports.genres_ids[feed], function (item) { return _.contains(tracksInDB, item) }).join(",");
		json.get("https://itunes.apple.com/lookup?id=" + tofetch + "&entity=song", function (err, result) {
			if (!err) {
				var trx = _.map(result.results, function (track) {
					var song = itunes.remap(track);
					items.push(song);
					return song;
				});
				db.addTracksBulk(trx);
				AllTracksInDB(items);
			}
		});
	},
	AllTracksInDB = function(items) {
		exports.genres[feed] = items;
		afterAllTracksInDB();
	},
	afterAllTracksInDB = function() {
		if (callback) { callback(); }
		setTimeout(exports.getGenreCharts.bind(this, feed, callback), 3600000);
	}
	if (!feed && callback) {
		callback([]);
		return;
	}
	json.get(feed, function (err, result) {
		if (!err && result && result.feed) {
			var songs = result.feed.entry;
			exports.genres_ids[feed] = _.map(songs, function (entry) { return entry.id.attributes['im:id'] })
			db.getSongsByIdList(exports.genres_ids[feed], afterDBQuery);
		}
		else {
			setTimeout(exports.getGenreCharts.bind(this, feed, callback), 3600000)
		}
	});
}
this.refresh = () =>  {
		var notAllTracksInDB = function(items) {
			tracksInDB = _.pluck(items, 'id');
			var tofetch = _.reject(charts.iTunesIDs, function (item) { return _.contains(tracksInDB, item) }).join(",");
			json.get("https://itunes.apple.com/lookup?id=" + tofetch + "&entity=song", function(err, result) {
				if (!err) {
					_.each(result.results, function(track) {
						var song = itunes.remap(track);
						db.addTrack(song, function() {});
						items.push(song);
					});
					AllTracksInDB(items)
				}
			});
		},
		AllTracksInDB = function(items) {
			charts.cache = items;
			afterAllTracksInDB();
		},
		afterAllTracksInDB = () => {
			setTimeout(this.refresh, 3600000)
		},
		afterDBQuery = function(items) {
			if (items.length < charts.limit) {
				notAllTracksInDB(items);
			}
			else {
				AllTracksInDB(items);
			}
		}
	json.get("https://itunes.apple.com/us/rss/topsongs/limit=" + charts.limit + "/explicit=true/json", (err,result) => {
		if (!err && result && result.feed) {
			var songs 			= result.feed.entry;
			charts.iTunesIDs 	= _.map(songs, function(entry) {return parseFloat(entry.id.attributes['im:id']) + ''});
			db.getSongsByIdList(charts.iTunesIDs, afterDBQuery);
		}
		else {
			setTimeout(this.refresh, 3600000)
		}
	});
}
this.getCharts = function(callback) {
	var topsongs = charts.cache,
		query 	 = _.pluck(topsongs, 'id'),
		haveytid = _.reject(topsongs, function(item) {return item.ytid == undefined}),
		notAllTracksInDB = function(items) {
			tracksInDB = _.pluck(items, 'id');
			var tofetch = _.reject(charts.iTunesIDs, function (item) { return _.contains(tracksInDB, item) }).join(",");
			json.get("https://itunes.apple.com/lookup?id=" + tofetch + "&entity=song", function(err, result) {
				if (!err) {
					_.each(result.results, function(track) {
						var song = itunes.remap(track);
						db.addTrack(song, function() { console.log('Track added through charts')});
						items.push(song);
					});
					AllTracksInDB(items);
				}
			});
		},
		AllTracksInDB = function(items) {
			charts.cache = items;
			afterAllTracksInDB(items);
		},
		afterAllTracksInDB = function(items) {
			callback(items);
		},
		afterDBQuery = function(items) {
			if (items.length < charts.limit) {
				notAllTracksInDB(items)
			}
			else {
				AllTracksInDB(items)
			}
		}
	if (haveytid.length < charts.limit) {
		db.getSongsByIdList(charts.iTunesIDs, afterDBQuery);
	}
	else {
		callback(haveytid)
	}

}
this.getAllCache = function() {
	return charts.cache;
}
this.getFirstTwenty = function() {
	return _.first(charts.cache, 20);
}
this.iTunesIDs 	= [];
this.cache 		= [];
this.table = [];
this.limit = 100;
