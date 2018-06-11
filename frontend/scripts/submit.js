submit = {
	getLibrarySuggestions: function () {
		if (oneTune.library().length > 0) {
			var first3 = _.last(oneTune.library(), 3).reverse();
			var afterSongsFetched = function(songs) {
			}
			DB.getTracks({
				ids: first3,
				callback: afterSongsFetched
			});
		}
	},
	selectSong: function(element) {
		submit.buildSubmit(element);
		$('.song-picker-activator').hide();
	},
	buildSubmit: function(element) {
		var wrapper = $('<div>').attr({
			'data-id': element.id
		})
		.addClass('submit-song-box')

		$('<img>').addClass('submit-song-box-image').attr('src', element.image).appendTo(wrapper);
		$('<div>').addClass('submit-song-box-name').text(element.name).appendTo(wrapper);
		$('<div>').addClass('submit-song-box-artist').text(element.artist).appendTo(wrapper);
		$('<div>').addClass('submit-song-select-another').text('Select another').appendTo(wrapper);
		$('.selected-area').html(wrapper);
		$('<p>').addClass('submit-step', '3. Select a song').prependTo('.selected-area');
	},
	showSong: function() {
		$('.submit-playlist-area').hide();
		$('.submit-story-area').hide();
		$('.submit-song-area').show();
	},
	showStory: function() {
		$('.submit-song-area').hide();
		$('.submit-playlist-area').hide();
		$('.submit-story-area').show();
	},
	buildSubmitPlaylist: function() {
		var pl_container = $('.compose-select-playlist')
		pl_container.empty();
		if (oneTune.playlists().length == 0) {
			pl_container.append("<p class='submit-no-playlists'><span style='font-weight:bold'>You have no playlists yet! To submit one, you can:</span><br/><br/>1) Make your own playlist by clicking 'New playlist' on the left sidebar<br/>2) Follow a playlist by going to someone's public playlist</p>");
		}
		else {
			var pl_select_container = $('<div>').addClass('submit-playlist-selection');
			_.each(oneTune.playlists(), function (playlist) {
				DB.getTracks({
					ids: playlist.tracks,
					callback: function (tracks) {
						var twobytwocovers = $('<div>').addClass('twobytwocovers');
						var tracks = _.uniq(tracks, false, function(track) { return track.image });
						_.chain(tracks).first(4).each(function (track) {
							$('<img>').attr('src', track.image).appendTo(twobytwocovers);
						});
						var pl_element = $('<div>').addClass('submit-playlist-element').attr('data-url', playlist.url);
						twobytwocovers.appendTo(pl_element);
						$('<h3>').text(playlist.name).appendTo(pl_element);
						$('<p>').text(playlist.tracks.length + ' tracks').appendTo(pl_element);
						pl_element.appendTo(pl_select_container);
					}
				});
			});
			pl_container.html(pl_select_container);
		}
		$('.submit-song-area').hide();
		$('.submit-story-area').hide();
		$('.submit-playlist-area').show();
	}
}