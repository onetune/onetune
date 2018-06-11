var SongsCollection, PlaylistCollection
var storeReady = function() {
	SongsCollection = songsdb;
}
var plStoreReady = function() {
	PlaylistCollection = pldb;
}
var songsdb = new IDBStore({storeName: 'songs'}, storeReady);
DB = {};
DB.getTracks = function(obj) {
	if (SongsCollection) {
		songsdb.query(function (tracks) {
			var matches 		= _.map(tracks, function (track) { return _.contains(obj.ids, track.id + '') ? track : null});
			var flattened  		= _.compact(matches);
			var withinlibdata	= _.map(flattened, function(track) { track.inlib = _.contains(oneTune.library(), track.id + ''); return track });
			obj.callback(withinlibdata);
		});
	}
	else {
		setTimeout(function() { DB.getTracks(obj) }, 100);
	}

}
DB.putUpdates = function(tracks_to_update, callback) {
	if (SongsCollection) {
		var toUpdate = tracks_to_update;
		var success = 0;
		var updateTrack = function(track, update) {
			console.log(track);
			_.each(update.fields_changed, function(value, key) {
				track[key] = value;
			});
			return track;
		}
		var updateArray = function(array, update) {
			return _.map(array, function(song) {
				if (song.id == update.track_id) {
					return updateTrack(song, update);
				}
				return song;
			});
		}
		var updateQueue = function(queue, update) {
			if (!queue) {
				return null;
			}
			if (queue.current.id == update.track_id) {
				queue.current = updateTrack(queue.current, update);
				if (update.fields_changed.ytid) {
					player.nowPlaying.replace(queue.current);
				}
				if (player.queues.current.current.id == update.track_id) {
					ytplayer.loadVideoById(queue.current.ytid);
				}
			}
			queue.history = updateArray(queue.history, update);
			queue.queue = updateArray(queue.queue, update);
			return queue;
		}
		var updateQueQue = function(queque, update) {
			queque.current = updateQueue(queque.current, update);
			queque.next = _.map(queque.next, function (q) { return updateQueue(q, update) });
			queque.prev = _.map(queque.prev, function (q) { return updateQueue(q, update) });
			$.publish('queue-changed');
			return queque;
		}
		songsdb.query(function (tracks) {
			_.each(tracks, function (track) {
				_.each(toUpdate, function (update) {
					if (track.id == update.track_id) {
						console.log(track, update)
						success++;
						_.each(update.fields_changed, function(value, key) {
							track[key] = value;
						});
						DB.addTrack(track);
					}
				});
			});
			callback(success);
		});
		_.each(toUpdate, function (u) {
			player.queues = updateQueQue(player.queues, u);
		});
	}
	else {
		setTimeout(function() { DB.putUpdates(obj) }, 100);
	}
}
DB.addTrack = function(obj) {
	if (SongsCollection) {
		songsdb.put(obj);
	}
	else {
		setTimeout(function() { DB.addTrack(obj) }, 100);
	}
}
DB.addYTIDToTrack = function(obj, ytid) {
	if (SongsCollection) {
		songsdb.query(function (tracks) {
			var matches 		= _.map(tracks, function (track) { return track.id == obj.id ? track : null});
			var flattened 		= _.compact(matches);
			if (flattened.length > 0) {
				var result = flattened[0];
				result.ytid = ytid;
				DB.addTrack(result);
			}
		});
	}
	else {
		setTimeout(function() { DB.addYTIDToTrack(obj) }, 100);
	}
}
DB.getAllIds = function(callback) {
	if (!SongsCollection) {
		setTimeout(function() {DB.getAllIds(callback)}, 100);
		return;
	}
	songsdb.query(function (data) {
		var tracks = _.pluck(data, 'id');
		callback(tracks);
	});
}
DB.getAllLibrarySongsSorted = function(ids, callback) {
	var library = ids,
		data = { user: chinchilla.loggedin },
		afterLocalTracksFetched = function(data) {
			var fetched = data;
			var tofetch = _.difference(library, _.pluck(fetched, 'id'));

			if (tofetch.length != 0) {
				$.ajax({
					url: '/api/tracks/get',
					data: {tracks: tofetch},
					dataType: 'json',
					success: function (response) {
						var alltracks = _.union(response.tracks, fetched);
						afterAllTracksFetched(alltracks);
						_.each(response.tracks, function (track) {
							DB.addTrack(track)
						})
					}
				})
			}
			else {
				afterAllTracksFetched(fetched)
			}
		},
		afterAllTracksFetched = function(tracks) {
			callback((helpers.sortTracks(library, tracks)).reverse());
		}

	DB.getTracks({ids: library, callback: afterLocalTracksFetched});
}