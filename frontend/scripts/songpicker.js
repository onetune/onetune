songpicker = {
	selectSong: function(object)   {
		var picker = $('<div>').addClass('song-picker');
		var query = '';
		var picklib;
		var createSong = function(song) {
			var song_object = $('<div>').addClass('song-picker-object');
			song_object.data(song);

			$('<img>').addClass('song-picker-image').attr('src', song.image).appendTo(song_object);
			$('<div>').addClass('song-picker-title').text(song.name).appendTo(song_object);
			$('<div>').addClass('song-picker-artist').text(song.artist).appendTo(song_object);

			return song_object;
		}
		var itunesQuery = function (header) {
			var q = query;
			var pickitunes = $('<div>').addClass('song-picker-itunes').appendTo(picker);
			$.ajax({
				url: 'https://itunes.apple.com/search',
				data: {
					term: query,
					entity: 'song',
					limit: 3
				},
				dataType: 'jsonp',
				success: function (json) {
					if (query == q) {
						loader.remove();
						_.each(json.results, function (song, key) {
							pickitunes.append(createSong(helpers.remap(song)));
						});
						selectFirst();
					}
				}
			});
			$('<div>').addClass('song-picker-section-header song-picker-itunes-header').text('Results for ' + query).appendTo(pickitunes);
			var loader = $('<img>').attr('src', '/api/svg/fading-loader').addClass('song-picker-loader').appendTo(pickitunes);
		}
		var searchYouTube = function() {
			var q = query;
			var pickyoutube = $('<div>').addClass('song-picker-youtube').appendTo(picker);
			$.ajax({
				url: 'https://www.googleapis.com/youtube/v3/search',
				data: {
					'maxResults': 5,
					q: query,
					key: 'AIzaSyCCRAemuZXM6GwYQWXOQI1e4kMnB57LtX0',
					part: 'snippet'
				},
				success: function (json) {
					if (query == q) {
						loader.remove();
						_.each(json.items, function (youtube_result) {
							var div = createSong({
								image: youtube_result.snippet.thumbnails.default.url,
								name: youtube_result.snippet.title,
								artist: youtube_result.snippet.channelTitle,
								id: youtube_result.id.videoId
							})
							pickyoutube.append(div);
						});
					}
				}
			});
			$('<div>').addClass('song-picker-section-header song-picker-itunes-header').text('YouTube videos for ' + query).appendTo(pickyoutube);
			var loader = $('<img>').attr('src', '/api/svg/fading-loader').addClass('song-picker-loader').appendTo(pickyoutube);

		}
		var selectFirst = function() {
			$('.song-picker-selected').removeClass('song-picker-selected');
			$('.song-picker-object:visible').eq(0).addClass('song-picker-selected');
		}
		var makeCallback = function() {
			object.div_callback(picker);
			$(object.input).on('keydown', function (e) {
				//40 down
				//38 up
				var song_selected = $('.song-picker-selected');
				var index = song_selected.index('.song-picker-object:visible');
				var previous = $('.song-picker-object:visible').eq(index-1);
				var next = $('.song-picker-object:visible').eq(index+1);
				if (e.keyCode == 40) {
					if (next.length > 0) {
						$(song_selected).removeClass('song-picker-selected');
						$(next).addClass('song-picker-selected');
					}
				}
				else if (e.keyCode == 38) {
					if (previous.length > 0) {
						$(song_selected).removeClass('song-picker-selected');
						$(previous).addClass('song-picker-selected');
					}
				}
				else if (e.keyCode == 13) {
					object.songPickedCallback($('.song-picker-selected').data());
					$(object.input).val('').trigger('input');
				}
			}).on('input', function (e) {
				$('.song-picker-container').show();
				query = $(object.input).val();
				$('.song-picker-itunes').remove();
				$('.song-picker-youtube').remove();
				if (query == '') {
					$(picklib).show();
				}
				else {
					$(picklib).hide();
					itunesQuery();
					searchYouTube();
				}
			}).on('keyup', function (e) {
				if (e.keyCode == 27) {
					$('.song-picker-container').hide();
				}
			});
		}

		if (oneTune.library().length) {
			if ($('#view').attr('data-route')) {
				makeCallback();
				return;
			}
			DB.getTracks({
				ids: _.first(oneTune.library.reverse(), 3),
				callback: function (songs) {
					picklib = $('<div>').addClass('song-picker-library').appendTo(picker)
					$('<div>').addClass('song-picker-section-header').text('From your library').appendTo(picklib);
					_.each(songs, function (song) {
						picklib.append(createSong(song));
					});
					makeCallback();
				}
			});
		}
		else {
			makeCallback();
		}
	}
}
