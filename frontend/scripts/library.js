library = {
	ajaxResponse: function(response) {
		console.log(response);
		if (response.success) {
			if (response.socket == 'multiple-playlist-songs-added') {
				onMultiplePlaylistSongsAdded(response.socket_body);
			}
			if (response.socket == 'tracks-added') {
				onTracksAdded(response.socket_body);
			}
			if (response.socket == 'multiple-playlist-songs-removed') {
				if (response.socket_body.destination == '/library') {
					onTracksRemoved(response.socket_body);
				}
				else {
					onPlaylistTracksRemoved(response.socket_body)
				}
				notifications.create('Removal successful.');
			}
		}
		if (response.socket == 'notification') {
			onNotification({html: response.socket_body});
		}

		library.checkForNotifications(response);
	},
	add: function(song) {
		var socketdata = {
			destination: 'library',
			tracks: [song.id + ''],
			token: chinchilla.token,
			type: 'library'
		}
		$.ajax({
			url: '/api/add_tracks',
			dataType: 'json',
			data: socketdata,
			success: library.ajaxResponse
		});
		libdom.markAsInLibrary(song.id + '');
		notifications.create('Adding...');
		if ($('#nowplaying-heart').attr('data-id') == song.id + '') {
			$('#nowplaying-heart-container').attr('class', 'in-library');
		}
		$('.library-button').text("Remove from library").removeClass('library-button').addClass('library-remove-button');
	},
	batchAdd: function(songs) {
		var socketdata = {
			destination: 'library',
			tracks: _.pluck(songs, 'id'),
			token: chinchilla.token,
			type: 'library'
		}
		$.ajax({
			url: '/api/add_tracks',
			dataType: 'json',
			data: socketdata,
			success: library.ajaxResponse
		});
		notifications.create('Adding...');
		_.each(songs, function(song) {
			libdom.markAsInLibrary(song.id + '');
		});
	},
	addMultipleByIdList: function(ids) {
		library.batchAdd(_.map(ids, function (id) { return {id: id} }));
	},
	remove: function(song) {
		$.ajax({
			url: '/api/remove_tracks',
			dataType: 'json',
			data: {tracks: [song.id], type: 'library', destination: 'library', token: chinchilla.token, date: Date.now()},
			success: library.ajaxResponse
		});
		libdom.markAsNotInLibrary(song.id + '');
		notifications.create('Removing...')
		$('.library-remove-button').text("Add to library").removeClass('library-remove-button').addClass('library-button');
		if (($('#nowplaying-heart').attr('data-id') + '') == (song.id + '')) {
			$('#nowplaying-heart-container').attr('class', 'not-in-library');
		}
		/*
			Remove from view
		*/
		var view = $('#view[data-route="/library"] .song[data-id="' + song.id + '"]').remove();
	},
	removeMultiple: function(track_ids, type, destination) {
		$.ajax({
			url: '/api/remove_tracks',
			dataType: 'json',
			data: {tracks: track_ids, type: type, destination: destination, token: chinchilla.token, date: Date.now()},
			success: library.ajaxResponse
		});
		notifications.create('Removing...')
		_.each(track_ids, function (t) {
			if (destination == '/library') {
				libdom.markAsNotInLibrary(t + '');
				if (($('#nowplaying-heart').attr('data-id') + '') == (t + '')) {
					$('#nowplaying-heart-container').attr('class', 'not-in-library');
				}
			}
			/*
				Remove from view
			*/
			var view = $('#view[data-route="'+destination+'"] .song[data-id="' + t + '"]').remove();
		})
	},
	checkForNotifications: function(response) {
		if (response['create-notification']) {
			notifications.create(response['create-notification'])
		}
	}
}
playlist = {
	add: function(song, playlist) {
		var socketdata = {
			destination: playlist,
			tracks: [song.id + ''],
			token: chinchilla.token,
			type: 'playlist'
		}
		$.ajax({
			url: '/api/add_tracks',
			dataType: 'json',
			data: socketdata,
			success: library.ajaxResponse
		});
		notifications.create('Adding...');
	},
	reorder: function (url, order) {
		notifications.create('Reordering...')
		$.ajax({
			url: '/api/playlists/reorder',
			dataType: 'json',
			data: {token: chinchilla.token, url: url, new_order: order},
			success: function (response) {
				if (response.success) {
					oneTune.playlists(_.map(oneTune.playlists(), function (playlist) {
						if (playlist.url == url) {
							if (playlist.newestattop) {
								order = order.reverse();
							}
							playlist.tracks = order;
						}
						return playlist;
					}));
					notifications.create('Reordering successful.');
				}
				else {
					notifications.create('Reordering failed.');
				}
			}
		});
	}
}
collections = {
	add: function(route, track) {
		if (route == '/library') {
			library.add({id: track});
		}
		else if (route.substr(0, 3) == '/u/'){
			playlist.add({id: track}, route);
		}
	}
}