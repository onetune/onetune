var echojs 	= require('echojs'),
	echo 	= echojs({key: process.env.ECHONEST_KEY});
	db 		= require('../db/queries'),
	itunes 	= require('./itunes'),
	_str 	= require('underscore.string'),
	async 	= require('async')

exports.get_echonest_song = function (onetune_id, callback) {
	var afterTrackFound = function (track) {
		var song = track[0];
		echo('song/search').get({
			artist: song.artist,
			title: song.name
		}, afterEchoNestQuery);
	}
	var afterEchoNestQuery = function (err, json) {
		if (err) return; //Error handling needed
		var results = json.response.songs;
		if (results.length == 0) return; //Error handling needed
		callback(results[0]);
	}
	db.getSingleTrack(onetune_id, afterTrackFound);
}
exports.start_radio_from_song = function(echonest_song, callback) {
	var afterRadioCreated = function(err, json) {
		if (err) {
			console.log(err);
			return;
		}; //Error handling needed
		exports.turn_on_radio({
			radio_id: json.response.session_id,
			songs: json.response.songs,
			callback: callback,
			from_song: echonest_song
		});
	}
	echo('/playlist/dynamic/create').get({
		song_id: echonest_song.id,
		type: 'song-radio',
		results: 1
	}, afterRadioCreated)
}
exports.clean_title = function(title) {
	return _str.clean(title.replace(/\(/g, '').replace(/\)/g, '').replace(/Explicit/g, '').replace(/Album Version/g, ''))
}
exports.turn_on_radio = function(data) {
	var firstsong = data.songs[0];
	firstsong.title = exports.clean_title(firstsong.title)
	var afterDBChecked = function(result) {
		if (result) {
			afterSongFetched(result);
		}
		else {
			itunes.search(firstsong.title + ' ' + firstsong.artist_name, {
				entity: 'song',
				limit: 1
			}, function (json) {
				if (json.resultCount == 0) {
					exports.get_another_track(data.radio_id, checkDB);
				}
				else {
					var isong = itunes.remap(json.results[0])
					afterSongFetched(isong)
					db.addTrack(isong);
				}
			});
		}
	}
	var afterSongFetched = function(song) {
		data.callback({
			radio_id: data.radio_id,
			queue: [],
			current: song,
			history: [],
			type: 'song-radio',
			from: data.from_song
		});
	}
	var checkDB = function(song) {
		firstsong = song;
		firstsong.title = exports.clean_title(firstsong.title);
		db.getTrackByName(song.title, song.artist_name, afterDBChecked);
	}
	checkDB(firstsong);
}
exports.get_song = function(song, callback) {
	song.title = exports.clean_title(song.title)
	var afterDBChecked = function(result) {
		if (result) {
			callback(result);
		}
		else {
			itunes.search(song.title + ' ' + song.artist_name, {
				entity: 'song',
				limit: 1
			}, function (json) {
				if (!json) { callback(null) }
				if (json.resultCount == 0) {
					callback(null)
				}
				else {
					var isong = itunes.remap(json.results[0])
					callback(isong)
					db.addTrack(isong);
				}
			});
		}
	}
	var checkDB = function(song) {
		song.title = exports.clean_title(song.title);
		db.getTrackByName(song.title, song.artist_name, afterDBChecked);
	}
	checkDB(song);
}
exports.get_another_track = function(session_id, callback) {
	exports.send_dummy_request(session_id);
	echo('/playlist/dynamic/next').get({
		session_id: session_id
	}, function (err, json) {
		callback(json.response.songs[0]);
	});
}
exports.get_next_tracks = function(session_id, socket, callback) {
	/*
		Make an async queue
	*/
	exports.create_echonest_queue(session_id);
	/*
		Do request
	*/
	exports[session_id].push({session_id: session_id, method: 'next5', socket: socket, cb: callback});
}
exports.send_dummy_request = function(session_id) {
	/*
		Make an async queue
	*/
	exports.create_echonest_queue(session_id);
	/*
		Add song to queue
	*/
	exports[session_id].push({session_id: session_id, method: 'dummy'}, function (err) {
	});
}
exports.create_echonest_queue = function(session_id) {
	if (!exports[session_id]) {
		exports[session_id] = async.queue(function (task, callback) {
			if (task.method == 'dummy') {
						echo('/playlist/dynamic/next').get({
							session_id: session_id,
							results: 1
						}, function (err, json) {
							console.log('Queue for ' + session_id + ' is now ' + exports[session_id].length() + ' long.');
							callback();
							if (!json.response.songs) {
								console.log(json);
								console.log('Couldnt fetch next song, error above.')
								return;
							}
							console.log('Next song is ', json.response.songs[0]);
						});
			}
			else if (task.method == 'next5')  {
						echo('/playlist/dynamic/next').get({
							session_id: session_id,
							results: 0,
							lookahead: 5
						}, function (err, json) {
							callback();
							if (err) {
								if (json && json.response.status.code == 5) {
									//task.socket.emit('/radio/timeout', {radio_id: session_id});
								}
								return;
							}
							async.eachSeries(
								json.response.lookahead,
								function (song, cb) {
									exports.get_song(song, function (result) {
										//task.socket.emit('/radio/add-to-queue', {song: result, radio_id: session_id})
										cb();
									});
								},
								task.cb);
						});
			}
		}, 1);
		exports[session_id].drain = function() {
			delete exports[session_id];
		}
	}
}