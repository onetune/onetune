libdom = {
	markAsNotInLibrary: function(id) {
		$('.song[data-id=' + id + ']').addClass('not-in-library').removeClass('in-library');
	},
	markAsInLibrary: function(id) {
		var song = $('.song[data-id=' + id + ']')
		song.removeClass('not-in-library').addClass('in-library');
	},
	addSongsToPlaylistLocal: function(url, tracks) {
		var playlists = oneTune.playlists();
		oneTune.playlists(_.map(oneTune.playlists(), function (playlist) {
			if (playlist.url == url) {
				_.each(tracks, function (track) {
					playlist.tracks.push(track + '');
				});
			}
			return playlist;
		}));
	},
	removeSongsFromPlaylistLocal: function(url, tracks) {
		var playlists = oneTune.playlists();
		oneTune.playlists(_.map(oneTune.playlists(), function (playlist) {
			if (playlist.url == url) {
				_.each(tracks, function (track) {
					playlist.tracks = _.without(playlist.tracks, track + '');
				});
			}
			return playlist;
		}));
	}
}