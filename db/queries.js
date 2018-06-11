var mongo       = require("mongoskin"),
	{promisify} = require('util'),
	_           = require("underscore"),
	constring   = process.env.MONGODB || 'mongodb://jonnyburger@localhost:27017/chinchilla',
	connection  = mongo.db(constring, {safe: true}),
	options     = {safe: true, upsert: true},
	standards   = require("../config/standards"),
	async 		= require("async");

connection.bind('errors');
connection.bind('subs');
connection.bind('artists');
connection.bind('albums');
connection.bind('tracks');
connection.bind('users');
connection.bind('libraries');
connection.bind('provisional_users');
connection.bind('service_connections');
connection.bind('playlists');
connection.bind('charts');
connection.bind('thread');
connection.bind('settings');
connection.bind('genres');
connection.bind('reports');
connection.bind('categories');
connection.bind('comments');
connection.bind('analytics_vote');
connection.bind('facebook_users');
connection.bind('analytics_referer');
connection.bind('posts');
connection.bind('recently_updated_ytids');

var setCreatedAt = function (o, date) {
  date = date || new Date();
  o.createdAt = date;
  setUpdatedAt(o, date);
  return o;
};

var setUpdatedAt = function (o, date) {
  date = date || new Date();
  o.updatedAt = date;
  return o;
};

/*
	Get matching artists.
	Example structure of an artist:
	{
		"name": "Favorite", --> name of the artist
		"id": 5078430       --> iTunes ID of the artist.
	}
*/
this.getArtist              = function(artistid, callback)  {
	connection.artists.find({"_id": parseFloat(artistid)}).toArray(function(err, items) {
		if (!err) {
			callback(items);
		}
	});
};
/*
	Get matching albums from an artist.
	Example structure of an album:
	{
		"artist": "Casper, Favorite, Kollegah & Shiml",     --> Name of the artists. Maybe need to splice them?
		"released": 2009,                                   --> Release year
		"tracks": 18,                                       --> number of tracks
		"image": "http://a1964.......",                     --> cover image. 100x100 format
		"artistid": 62791592,                               --> iTunes ID of artist
		"id": 311797472,                                    --> iTunes ID of album
		"explicit": true,                                   --> does it include the word fuck? (true | false)
		"name": "Chronik II",                               --> album name
		"tracklist": [                                      --> ID's of track names
			311797587,
			311797659,
			311797668,
			   .......
		]
	}
*/
this.getAlbums              = function(artistid, callback)  {
	connection.albums.find({"artistid": parseFloat(artistid)}, {sort:[['release', -1]]}).toArray(function(err, items) {
		if (!err) {
			callback(items);
		}
	});
};
/*
	Get track by a artist. Track structure:
	{
		"artistid": 5078430,
		"albumid": 433611130,
		"id": 433611169,
		"artist": "Favorite",
		"album": "Christoph Alex",
		"name": "F.A.V. 2011",
		"preview": "http://a1916.phobos.apple.com/us/r1000/064/Music/1d/d8/87/mzi.hriidmxd.aac.p.m4a",
		"image": "http://a608.phobos.apple.com/us/r1000/069/Music/22/4f/6a/mzi.dnbcjybx.100x100-75.jpg",
		"release": "2011-05-06T07:00:00Z",
		"explicit": true,
		"cdcount": 2,
		"cdinalbum": 1,
		"tracks": 16,
		"numberinalbum": 2,
		"duration": 197920,
		"genre": "Hip Hop/Rap",
		"listens": 0,
		"ytid": "fsdfs-fssSfs" //Optional!
	}
*/
this.getTracks              = function(artist, callback)    {
	connection.tracks.find({"artist": artist}).toArray(function(err, items) {
		if (!err) {
			callback(items);
		}
	});
};
this.countBrokenCovers = function () {
	return promisify(connection.tracks.count.bind(connection.tracks))({provider: {$exists: false}, new_cover: {$exists: false}});
	
}
this.getTrackWithBrokenCover = function (callback) {
	return promisify(connection.tracks.findOne.bind(connection.tracks))({provider: {$exists: false}, new_cover: {$exists: false}});
}
this.getTrackByName         = function(name, artist, callback) {
	connection.tracks.findOne({"name": name, "artist": artist}, function (err, item) {
		if (!err) {
			callback(item);
		}
		else {
			callback(null);
		}
	});
};
this.getSongsByArtistId     = function(artistid, callback) {
		connection.tracks.find({"artistid": artistid}).toArray(function(err, items) {
			if (!err) {
			callback(items);
		}
	});
};
this.getSingleTrack         = function (id, callback)       {
	connection.tracks.find({"_id": id + ''}).toArray(function(err, item) {
		if (!err) {
			callback(item);
		}
	});
};
this.saveTrack = function (id, track) {
	return promisify(connection.tracks.update.bind(connection.tracks))({id}, track);
}
this.findOneTrack           = function(id, callback)        {
	connection.tracks.findOne({_id: id + ''}, function(err, item) {
		if (!err) {
			callback(item);
		}
	});
};
this.getSingleAlbum         = function(albumid, callback)   {
	/*
		Convert albumid from a number into a string
	*/
	var albumnumber = parseFloat(albumid);
	connection.albums.find({id: albumnumber}).toArray(function(err, items) {
		if (!err) {
		   callback(items);
		}
	});
};
this.getTracksFromAlbum     = function(albumid, callback)   {
	/*
		Convert albumid from anumber into a string
	*/
	var albumnumber = parseFloat(albumid);
	connection.tracks.find({"albumid": albumnumber}).toArray(function(err, items) {
		if (!err) {
			callback(items);
		}
	});
};
this.addTrack = function(track, callback)    {
	track.id = track.id + '';
	if (track.explicit == 'false') {
		track.explicit = false;
	}
	track._id = track.id;
	setCreatedAt(track);
	connection.tracks.insert(track, options, function(err) {
		if (callback) { callback(); }
	});
};
this.addYTID                = function(track, callback)     {
	track.id = track.id + '';
	track._id = track.id;
	setUpdatedAt(track);
	// NOTE: referencing track.updatedAt breaks encapsulation of setUpdatedAt
	connection.tracks.update(
		{_id: track.id + ''},
		{ $set: {ytid: track.ytid, updatedAt: track.updatedAt} },
		{safe: true, upsert: false},
		function(err) {
			if (!err) {
					callback();
		}
	});
};
this.updateTrack  			= function(track, callback) {
	setUpdatedAt(track);
	connection.tracks.update({_id: track.id + ''}, track, {safe: true, upsert: false}, function (err) {
		if (!err && callback) {
			callback();
		}
	});
};
this.addTracksBulk          = function(tracks, callback)    {
	var d = new Date();
	tracks = _.map(tracks, function (track) {
		track.id = track.id + '';
		track._id = track.id;
		if (track.explicit == 'false') {
			track.explicit = false;
		}
		setUpdatedAt(track);
		return track;
	});
	this.getSongsByIdList(_.pluck(tracks, 'id'), function (already_existing) {
		var already_existing_ids = _.pluck(already_existing, 'id');
		var toinsert = _.reject(tracks, function (track_to_check) {
			return _.contains(already_existing_ids, track_to_check.id);
		});
		connection.tracks.insert(toinsert, options, function (err) {
			if (err) {
				console.log(err);
			}
			else {
			}
		});
	});
};
this.addAlbum               = function(album, callback)     {
	album.name = album.name += '';
	setUpdatedAt(album);

	connection.albums.update({id: album.id}, album, options, function(err) {
		if (err) {
			console.log(err);
		}
		else {
			if (callback) {
				callback();
			}
		}
	});
};
this.addArtist              = function(artist, callback)    {
	setCreatedAt(artist);
	connection.artists.insert(artist, options, function(err) {
		if (!err && callback) {
			callback();
		}
	});
};
this.getSongsByIdList       = function(ids, callback)       {
	var queries = [];
	connection.tracks.find({_id: {$in: ids}}).toArray(function(err, items) {
		if (!err) {
			/*
				Sort by time added
			*/
			var songs = [];
			_.each(ids, function(id) {
				var song = _.find(items, function(item) { return (item.id + '') == (id + ''); });
				if (song) {
					songs.push(song);
				}
			});
			callback(songs);
		}
	});
};
this.updateArtist           = function(artist) {
	setUpdatedAt(artist);
	connection.artists.update({id: artist.id}, artist, options);
};
this.addUser                = function(user, callback)      {
	connection.users  .find({id: user.id}).toArray(function(err, items) {
		if (!err) {
			var result      = (items.length !== 0) ? items[0] : user;
			result.token    = user.token;
			setCreatedAt(user);
			connection.users.update({id: user.id}, result, options, function(err) {
				if (!err) {
					callback();
				}
			});
		}
	});
};
this.checkIfUserExists 		= function(user, callback) {
	connection.users.findOne({id: user.id}, function (err, item) {
		if (!err) {
			callback(item ? item : false);
		}
	});
};
this.checkIfUsernameIsTaken = function(username, callback) {
	connection.users.findOne({username: username}, function (err, item) {
		if (!err) {
			callback(item);
		}
	});
};
this.getUser                = function(token, callback)     {
	if (token == '' || !token) {
		callback(null);
		return;
	}
	connection.users  .find   ({token: token}).toArray(function(err, items) {
		if (!err) {
			var user = (items.length !== 0) ? items[0] : null;
			callback(user);
		}
	});
};
this.getUserByUsername 		= function (username, callback) {
	connection.users.findOne({username: username}, function (err, item) {
		callback(item);
	});
};
this.updateUser				= function(user, callback) {
	setUpdatedAt(user);
	connection.users.update({id: user.id}, user, options, function (err) {
		if (!err) {
			callback();
		}
	});
};
this.addUserProvisionally 	= function(user, callback) {
	setCreatedAt(user);
	connection.provisional_users.insert(user, function (err, item) {
		if (!err) {
			callback(item[0]);
		}
	});
};
this.addLastfmToken  		= function(user, token, username, callback) {
	var object = {
		user: user.id,
		service: 'lastfm',
		service_username: username,
		token: token
	}
	console.log('gonna update', object)
	connection.service_connections.update({
		user: object.user,
		service: object.service
	}, object, options, function (err) {
		if (!err) {
			callback()
		}
	});
}
this.getLastfmToken			= function(user, callback) {
	connection.service_connections.findOne({
		user: user.id,
		service: 'lastfm'
	}, function (err, item) {
		if (!err && item) {
			callback(item);
		}
		else {
			callback(false);
		}
	});
}
this.getServicesFromUser 	= function(user, callback) {
	connection.service_connections.find({
		user: user.id
	}).toArray(function (err, items) {
		if (!err) {
			callback(items);
		}
	});
}
this.getProvisionalUser 	= function(id, callback) {
	connection.provisional_users.findOne({_id: mongo.ObjectID.createFromHexString(id)}, function (err, item) {
		if (!err) {
			callback(item);
		}
	});
};
this.getUserCollections     = function(user, callback)      {
	connection.libraries.find({id: user.id}).toArray(function(err, item) {
		var collections;
		if (!err) {
			if (item.length === 0) {
				collections = {
					library:    [],
					starred:    [],
					playlists:  [],
					id:         user.id,
					settings:   standards.settings,
				};
			}
			else {
				collections = item[0];
			}
			callback(collections);
		}
	});
};
this.saveUserCollections    = function(coll, callback) {
	setUpdatedAt(coll);
	connection.libraries.update({id: coll.id}, coll, options, function(err) {
		if (!err) {
			callback(coll);
		}
	});
};
this.updateSettings         = function(data, callback)      {
	connection.users.findOne({token: data.token}, function (err, u) {
		if (u) {
			u.settings = _.map(data.settings, function (setting) {
				setting.value = (setting.value == 'true' ? true : false);
				return setting;
			});
			setUpdatedAt(u);
			connection.users.update({token: data.token}, u, options, function (err) {
				if (!err) {
					callback();
				}
			});
		}
	});
};
this.getAlbumCovers         = function(limit, callback)     {
  limit = limit || 100;
	connection.albums.find({}, {limit: limit}).toArray(function(err, items) {
		if (!err) {
			callback(items);
		}
	});
};
this.createPlaylist         = function(playlist, callback)  {
	setCreatedAt(playlist);
	connection.playlists.insert(playlist, options, function(err) {
		if (!err && callback) {
			callback();
		}
	});
};
this.getPlaylist            = function(playlist, callback)  {
	connection.playlists.findOne({'url': playlist}, function(err, item) {
		if (!err && callback) {
			callback(item);
		}
	});
};
this.updatePlaylist         = function(oldname, name, url, callback) {
	// NOTE: breaks encapsulation
	connection.playlists.update({'url': oldname}, {$set: {url: url, name: name, updatedAt: new Date () } }, function(err, item) {
		if (!err && callback) {
			callback(item);
		}
	});
};
this.removePlaylist         = function(url, callback) {
	connection.playlists.remove({url: url}, options, function(err, item) {
		if (!err && callback) {
			callback({fail: false});
		}
	});
};
this.getPlaylistsFromUserId = function(id, callback) {
	connection.playlists.find({owner: id}).toArray(function(err, items) {
		callback(items);
	});
};
this.getPublicPlaylistsFromUserId = function(id, callback) {
	connection.playlists.find({owner: id, 'public': true}).toArray(function(err, items) {
		callback(items);
	});
};
this.getPlaylistByUrl       = function(url, callback) {
	connection.playlists.findOne({url: url}, function(err, item) {
		callback(item);
	});
};
this.savePlaylist           = function(playlist, callback) {
	setUpdatedAt(playlist);
	connection.playlists.update({url: playlist.url} , playlist, function(err) {
		if (callback && !err) {
			callback();
		}
	});
};
this.setPlaylistStyle		= function(playlist, style, callback) {
	connection.playlists.update({url: playlist}, {$set: {style: style}}, function (err) {
		if (!err) {
			callback();
		}
		else {
			console.log(err)
		}
	});
}
this.getFollowedPlaylistsByUserId = function (id, callback) {
	connection.playlists.find({'followers': id, public: true}).toArray(function (err, items) {
		callback(items);
	});
};
this.saveFreebaseInfo       = function(artist, callback) {
	setUpdatedAt(artist);
	// NOTE: breaks encapsulation
	connection.artists.update({id: artist.id}, {$set: {freebase: artist.freebase, updatedAt: artist.updatedAt}}, function() {});
};
this.cacheCharts            = function(chart, callback) {
	setUpdatedAt(chart);
	connection.charts.update({year: chart.year}, chart, options, function(err) {
		if (!err) {
			callback();
		}
	});
};
this.checkCharts            = function(callback) {
	connection.charts.find({}, {limit: 100}).toArray(function(err, items) {
		if (!err) {
			callback(items);
		}
	});
};
this.getRetroCharts         = function(year, callback) {
	var year = (1900 < parseFloat(year) < 2020) ? parseFloat(year) : 1959;
	connection.charts.findOne({year: year}, function(err, chart) {
		if (!err) {
			callback(chart);
		}
	});
};
this.getSongCount           = function(callback) {
	connection.tracks.count({}, function (err, count) {
		callback(count);
	});
};
this.getUserList            = function(callback) {
	connection.users.find({}, {limit: 100}).toArray(function (err, users) {
		if (!err) {
			callback(users);
		}
	});
};
this.getUserCount 			= function (callback) {
	connection.users.count(function (err, count) {
		if (!err) {
			callback(count);
		}
	});
};
this.getRedditThread        = function(id, callback) {
	connection.thread.findOne({thread_id: id}, function(err, item) {
		callback(item);
	});
};
this.saveRedditThread       = function(thread, callback) {
	setUpdatedAt(thread);
	connection.thread.update({thread_id: thread.thread_id}, thread, options, function(err, callback) {
	});
};
var getWatchIds             = function(callback) {
	connection.settings.findOne({id: 'watchIds'}, function (err, item) {
		if (!item) {
			item = {
				id: 'watchIds',
				values: []
			};
		}
		callback(item);
	});
};
this.getWatchIds = getWatchIds;
this.addWatchId             = function(id, callback) {
	var d = new Date();
	getWatchIds (function (item) {
		item.values.push(id);
		setUpdatedAt(item, d);
		connection.settings.update({id: 'watchIds'}, item, options, function (err) {
			console.log('Added to watch list:', id, item);
			callback();
		});
	});
};
this.removeWatchId  = function(id, callback) {
	getWatchIds(function (item) {
	  item.values = _.without(item.values, id);
		connection.settings.update({id: 'watchIds'}, item, options, function (err) {
			console.log('Removed from watch list:', id, item);
			callback();
		});
	});
};
this.getReports 	= function(callback) {
	connection.reports.find({}).toArray(function (err, items) {
		if (!err) {
			callback(items);
		}
	});
};
this.saveReport 	= function(report, callback) {
	setCreatedAt(report);
	connection.reports.insert(report, options, function (err, b) {
		if (!err) {
			callback(b);
		}
		else {
			callback(false);
		}
	});
};
this.getSingleReport = function(id, callback) {
	connection.reports.findOne({_id: mongo.ObjectID.createFromHexString(id)}, function (err, report) {
		if (!err) {
			callback(report);
		}
	});
};
this.saveRecentUpdate = function(data, callback) {
	setUpdatedAt(data);
	connection.recently_updated_ytids.update({track_id: data.track_id}, data, options, function (err) {
		callback(err ? false : true);
	});
};
this.getUpdates = function(tracks, date, callback) {
	var query;
	if (date) {
		query = {track_id: {$in: tracks}, time: {$gte: parseInt(date)}};
	}
	else {
		query = {track_id: {$in: tracks}};
	}
	connection.recently_updated_ytids.find(query).toArray(function (err, items) {
		if (!err) {
			callback(items);
		}
	});
};
this.removeReport = function(id, callback) {
	connection.reports.remove({_id: mongo.ObjectID.createFromHexString(id)}, callback);
};
this.insertErrorReport = function(report, callback) {
	setCreatedAt(report);
	console.log(report)
	connection.errors.insert(report, options, function (err) {
		if (!callback) return;
		callback(!err);
	});
};
this.insertSub = insertSub = function(sub, callback) {
	setCreatedAt(sub);
	connection.subs.update({name: sub.name}, sub, options, function () {
		if (!callback) return;
		callback();
	});
};
this.getSubs = function(callback) {
	connection.subs.find({}).toArray(function (err, items) {
		if (!err && callback) {
			callback(_.sortBy(items, 'order'));
		}
	});
};
this.addModerator = function(sub, name, callback) {
	connection.subs.findOne({name: sub}, function (err, item) {
		if (item) {
			if (!item.moderators) { item.moderators = []; }
			item.moderators.push(name);
			setCreatedAt(item);
			insertSub(item, callback);
		}
		else {
			callback();
		}
	});
};
this.submitPost = function(post, callback) {
	setCreatedAt(post);
	connection.posts.insert(post, options, function (err, item) {
		callback(err ? false : item);
	});
};
this.getPost = function(sub, slug, callback) {
	connection.posts.findOne({sub: sub, slug: slug}, function (err, item) {
		if (callback) {
			callback(item);
		}
	});
};
this.getPostsByUser = function(username, callback) {
	connection.posts.find({user: username}).sort({'date': -1}).toArray(function (err, items) {
		if (!err) {
			callback(items);
		}
	});
};
this.deletePost = function(post, callback) {
	connection.posts.remove({_id: post._id}, options, function (err) {
		if (callback) {
			callback();
		}
	});
};
this.getPostBySlug = function(slug, callback) {
	connection.posts.findOne({slug: slug}, function (err, item) {
		if (callback) {
			callback(item);
		}
	});
};
this.getPostById = function(id, callback) {
	connection.posts.findOne({_id: mongo.ObjectID.createFromHexString(id)}, function (err, item) {
		if (callback) {
			callback(item);
		}
	});
};
this.savePost = function(post, callback) {
	setUpdatedAt(post);
	connection.posts.update({sub: post.sub, slug: post.slug}, post, options, function (err) {
		if (!err && callback) {
			callback();
		}
	});
};
this.getPosts = function(sub, callback, options) {
	var query = sub ? {sub: sub} : {};
	var sort = {
		sticky: -1
	};
	if (options.ranking == 'top') {
		sort['vote_count'] = -1;
		query.date = {$gte: options.after};
	}
	if (options.ranking == 'new') {
		sort['date'] = -1;
	}
	if (options.type) {
		query.entity = options.type;
	}
	//This is intentionally repetitive... first ranking criteria is score, then date.
	sort['date'] = -1;
	sorted = connection.posts.find(query).sort(sort);
	var current_url;
	var count = sorted.count(function (err, count) {
		sorted.skip((options.page-1)*options.posts_per_page).limit(options.posts_per_page).toArray(function (err, posts) {
			if (!err) {
				callback(posts, count);
			}
		});
	});
};
this.getComments = function(slug, callback, rank) {
	var sort = {};
	if (rank && rank == 'new') {
		sort.date = -1;
	}
	sort.score = -1;
	connection.comments.find({post: slug}, {limit: 200}).sort(sort).toArray(function(err, items) {
		if (!err) {
			callback(items);
		}
	});
};
this.saveComment = function(comment, callback) {
	setCreatedAt(comment);
	connection.comments.insert(comment, function (err, items) {
		if (!err) {
			callback(items[0]);
		}
	});
};
this.getComment = function(id, callback) {
	connection.comments.findOne({_id: mongo.ObjectID.createFromHexString(id)}, function (err, item) {
		if (!err) {
			callback(item);
		}
	});
};
this.updateComment = function(comment, callback) {
	setUpdatedAt(comment);
	connection.comments.update({_id: comment._id}, comment, options, function (err) {
		if (!err) {
			callback();
		}
	});
};
this.saveReddit = function(subreddit, tracks, callback) {
	var doc = {
		subreddit: subreddit,
		tracks: tracks
	};
	connection.genres.update({subreddit: subreddit}, doc, options, function (err, items) {
		if (!err) {
			console.log('Reddit tracks saved.');
		}
	});
};
this.fetchRedditTracks = function (callback) {
	connection.genres.find({}).toArray(function (err, items) {
		var reddit = {};
		_.each(items, function (item) {
			reddit[item.subreddit] = item.tracks;
		});
		callback(reddit);
	});
};
this.getFancyStats = function(callback) {
	var stats = {};
	connection.libraries.count({$where: 'this.library.length >= 0'}, function (err, result) {
		stats.people_with_libraries = result;
		connection.libraries.count({$where: 'this.library.length > 0'}, function (err, result) {
			stats.people_that_hearted_tracks = result;
			connection.libraries.count({$where: 'this.library.length > 10'}, function (err, result) {
				stats.people_that_hearted_more_than_ten_tracks = result;
				connection.libraries.count({$where: 'this.library.length > 100'}, function (err, result) {
					stats.people_that_hearted_more_than_hundred_tracks = result;
					connection.libraries.count({$where: 'this.library.length > 1000'}, function (err, result) {
						stats.people_that_hearted_more_than_thousand_tracks = result;
						connection.executeDbCommand({aggregate: 'libraries', pipeline: [
						    {$unwind: '$library'},
						    { $group : { _id : '', count : { $sum : 1 } } }
						]}, function(err, item) {
							stats.total_hearts_total = item.documents[0].result[0].count;
							callback(stats);
						});
					});
				});
			});
		});
	});
};
this.insertReferer = function (refObj, callback) {
  setCreatedAt(refObj);
  connection.analytics_referer.insert(refObj, function (err) {
    if (!err && callback) {
      return callback();
    }
    return err;
  });
};
this.insertAccess = function (data, collection, callback) {
  setCreatedAt(data);
  connection.collection(collection).insert(data, function (err) {
    if (!err && callback) {
      return callback();
    }
    return err;
  });
};
this.insertVote = function (data, callback) {
  setCreatedAt(data);
  connection.analytics_vote.insert(data, function (err) {
    if (!err && callback) {
      return callback();
    }
    return err;
  });
};
this.insertFacebookUser = function (access_token, object, callback) {
	object.access_token = access_token;
	connection.facebook_users.insert(object, function (err) {
		if (!err && callback) {
			callback();
		}
	});
}
this.getFacebookUser = function (access_token, callback) {
	connection.facebook_users.findOne({access_token: access_token}, function (err, user) {
		if (!err && callback) {
			callback(user);
		}
	});
}
this.getPlaylistCategories = function(callback) {
	connection.categories.find({}).toArray(function (err, items) {
		if (!err && callback) {
			callback(items);
		}
	});
}
this.insertPlaylistCategory = function(category, callback) {
	connection.categories.insert(category, options, function (err) {
		if (!err && callback) {
			callback();
		}
	});
}
