/**
 * workers:
 *
 * getAlbumCovers:
 *    fetches 100 album covers from the db
 *    accumulator: covers
 *    period: 86400000 = 1 day
 *
 * getRedditTracks:
 *    c.f.: https://www.reddit.com/dev/api#GET_search
 *    for each subreddit being tracked,
 *      obtain a list of song titles and metadata in recent youtube posts to that subreddit
 *    for each song
 *      obtain metadata for the song from itunes
 *      add to db
 *    accumulator: exports.redditsongs
 *    period: 86400000 = 1 day
 *
 * getRetroCharts:
 *    for each year
 *      obtain from Wikipedia the top 100 songs
 *    for each song
 *      obtain metadata for the song from itunes
 *      add to db
 *    accumulator: retrocharts[year]
 *
 */
var db 					= require("../db/queries"),
	_					= require("underscore"),
	_s 					= require("underscore.string")
	itunes 				= require("../config/itunes"),
	json 				= require("jsonreq"),
	helpers 			= require("../frontend/scripts/helpers").helpers,
	async 				= require("async"),
	request				= require("request");
var covers 				= [];
var subreddits 			= [
	'Music',
	'Country',
	'DubStep',
	'Punk',
	'Metal',
	'Trance',
	'ElectronicMusic',
	'ClassicalMusic',
	'AlternativeRock',
	'90sMusic',
	'Blues',
	'House',
	'ListenToThis',
	'GameMusic',
	'Jazz',
	'50sMusic',
	'60sMusic',
	'70sMusic',
	'80sMusic',
	'2000sMusic',
	'BrazilianMusic',
	'KPop',
	'JPop',
	'PopMusic',
	'HipHopHeads',
	'Rap',
	'Rock',
	'90sHipHop',
	'FutureBeats'
].sort();
var fullyears 			= _.range(1959, 2018);
var years 				= fullyears;
var retrocharts 		= {};
var subs 				= [];
var fetchedSubs 		= false;
exports.redditsongs 	= {};
var getAlbumCovers 		= function() {
	db.getAlbumCovers(100, function(items) {
		covers 			= _.shuffle(items);
		setTimeout(getAlbumCovers, 86400000);
	});
}
var getRedditTracks 	= function(subreddit) {
	json.get('https://www.reddit.com/r/' + subreddit + '/search.json?q=site%3Ayoutube.com&restrict_sr=on&sort=top&t=week&limit=100', function(err, json) {
		exports.redditsongs[subreddit] = [];
		if (!json) return;
		var songs = json.data.children;
		var songs = _.filter(songs, function (song) { return song.data.domain == 'youtube.com'});
		//var songs = _.filter(songs, function (song) { return song.data.title.indexOf(" - ") != -1});
		var songs = _.filter(songs, function (song) { return song.data.media });
		var i = 0; var max  = songs.length-1;

		async.each(songs, function (song, callback) {
			var title = song.data.title;
			var title = (title.indexOf('(') != -1) ? title.substr(0, title.indexOf('(')) : title;
			var title = (title.indexOf('[') != -1) ? title.substr(0, title.indexOf('[')) : title;
			itunes.search(title, {entity: 'song', limit: 1}, function (json) {
				if (json && json.results && json.results.length != 0 && song.data.media.oembed.url != undefined) {
					var dbsong = itunes.remap(json.results[0]);
					dbsong.ytid = song.data.media.oembed.url.substr(-11);
					if (exports.redditsongs[subreddit]) {
						exports.redditsongs[subreddit].push({
							song: dbsong,
							upvotes: song.data.score,
							hqimg: helpers.getHQAlbumImage(dbsong, 200)
						});
					}
					db.addTrack(dbsong, function() {
						//console.log("Track added through " + subreddit + ". ")
					});
					callback();
				}
				else {
					callback()
				}
			});
		}, function () {
			db.saveReddit(subreddit, exports.redditsongs[subreddit])
			setTimeout(function() { getRedditTracks(subreddit) }, 3600000*24);
		});
	});
}
var getRetroCharts		= function(year, callback) {
	request('https://en.wikipedia.org/w/api.php?action=query&prop=revisions&titles=Billboard_Year-End_Hot_100_singles_of_' + year + '&rvprop=content&format=json', function(err, response, body) {
		var json = JSON.parse(body);
		var page 	= json.query.pages[_.keys(json.query.pages)[0]],
			title 	= page.title,
			revs 	= page.revisions[0]['*'],
			tracks 	= revs.split('|-'),
			charts 	= _.last(_.first(tracks, 102), 100),
			charts  = _.map(charts, function(line) { return line.replace('\n! scope="row" | ', '') }),
			charts  = _.map(charts, function(line) {
				var split = line.split('"');
				return {title: split[1], artist: split[2]}
			}),
			charts 	= _.map(charts, function(song) {
				if (song.title && song.artist) {
					return {
						title: _s.clean(_.last(song.title.replace(/[[\]]/g,'').split('|'))),
						artist: _s.clean(_.last(song.artist.replace(/[[\]]/g,'').replace('||', '').split('\n')[0].split('|'))).replace(/featuring/g, '')
					}
				}
				else {
					return null;
				}

			}),
			charts 	= _.compact(charts);
			retrocharts[year] = [];
		function lookUpOne(song) {
			itunes.search(song.title + ' ' + song.artist, {entity: 'song', limit: 1}, function (json) {
				if (json && json.results.length != 0) {
					var itsong = itunes.remap(json.results[0]);
					retrocharts[year].push(itsong);
					db.addTrack(itsong, function() {
						console.log('Track added through retro charts')
					});
				}
				i++;
				if (i == max) {
					callback()
				}
				else {
					lookUpOne(charts[i]);
				}
			});
		}
		var i = 0, max = charts.length
		lookUpOne(charts[i]);

	});
}
this.returnAlbumCovers	= function() {
	return covers;
}
this.returnRedditSongs 	= function(subreddit) {
	return exports.redditsongs[subreddit];
}
this.returnSubreddits 	= function() {
	return subreddits;
}
this.getYearRange 		= function() {
	return fullyears;
}
this.getSubs 			= function() {
	return subs;
}
this.getSubsAsync 		= function(callback) {
	if (!fetchedSubs) {
		setTimeout((function () {
			this.getSubsAsync(callback);
		}).bind(this), 100);
	}
	else {
		callback(subs);
	}
}
this.getSub 			= function(sub) {
	return _.where(subs, {name: sub})[0];
}
getAlbumCovers();
db.fetchRedditTracks(function (reddittracks) {
	exports.redditsongs = reddittracks;
});
_.each(subreddits, function(subreddit, key) {
	setTimeout(function () {
		getRedditTracks(subreddit);
	}, 5000*key);
});
var y = 0, max = years.length, retroChartsCallback = function() {
	var table = {
		year: years[y],
		charts: _.pluck(retrocharts[years[y]], 'id')
	}
	db.cacheCharts(table, function() {
		if (y !== max) {
			getRetroCharts(years[y], retroChartsCallback);
		}
		console.log('Table saved.', years[y]);
	});
	y++;
}

db.checkCharts(function(chartscount) {
		var tofetch = _.difference(years ,_.pluck(chartscount, 'year'));
		years = tofetch;
		max   = years.length;
		if (years.length != 0) {
			getRetroCharts(years[y], retroChartsCallback)
		}
});

db.getSubs(function (items) {
	fetchedSubs = true;
	subs = items;
});
