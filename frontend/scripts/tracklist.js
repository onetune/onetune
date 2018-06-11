// TODO: Error handling when no tracks.length == 0
tracklist = {
	build: function (config) {
		/*
			Build a container for the actual tracklist
		*/
		var container = $('<div>')
		.addClass('one-track-wrapper album-tracks')
		.attr('data-represents', config.represents)

		if (config.type == 'box') {
			container.addClass('one-track-box');
		}


		/*
			Create a header
		*/
		var header = $('<div>')
		.addClass('one-track-wrapper-header')
		.appendTo(container)


		/*
			Title
		*/
		var title = $('<div>').addClass('one-track-title').appendTo(container);
		$('<div>').text(config.title).appendTo(title);

		var subtitle = $('<div>').addClass('one-track-subtitle').appendTo(container);
		if (config.represents) {
			$('<span>').text((config.entity == 'song') ? 'See all tracks' : 'See all').attr('data-navigate', config.represents).appendTo(subtitle);
		}

		if (config.entity == 'song_post') {
			$('<span>').text(' - ').appendTo(subtitle);
			$('<span>').text('Play').addClass('play-list').appendTo(subtitle);
		}

		if (!config.tracks || config.tracks.length == 0) {
			container.append('<p class="one-no-tracks">No tracks available</p>')
			return container;
		}

		/*
			Header image
		*/
		var cover = $('<img>')
		.addClass('one-track-wrapper-cover')
		.attr('data-px', 100);

		var cover_src;
		if (config.cover == 'first') {
			cover_src = helpers.getHQAlbumImage(config.tracks[0], 100);
		}
		if (config.cover == 'placeholder') {
			cover_src = '/frontend/images/story_placeholder.png'
		}
		if (config.cover == 'first_post') {
			cover_src = helpers.getHQAlbumImage(config.tracks[0].info, 100);
		}
		if (config.cover == 'first_playlist') {
			cover_src = config.tracks[0].thumbnails[0];
		}
		cover.attr('src', cover_src);
		cover.appendTo(header);



		/*
			Play button
		*/
		if (config.entity == 'song') {
			var playbutton = $('<div>')
			.addClass('play-list play-list-visual')
			.attr('data-id', config.represents)
			.appendTo(container);

			$('<div>')
			.addClass('play-list-play-icon')
			.appendTo(playbutton);

			$('<div>')
			.addClass('play-list-decoration')
			.appendTo(playbutton);
		}
		if (config.submit) {
			var button = $('<div>').addClass('orange-button one-header-button').text('Submit').attr('data-navigate', config.submit === true ? '/one/submit' :'/one/' + config.submit + '/submit').appendTo(header)
		}

		/*
			Track list
		*/
		var track_table = $('<table>')
		.addClass('one-track-table')

		var showable = function(div, config, key) {
			// If there is a limit set, do not display all tracks
			if (!config.displayed || config.displayed > key) {
				div.addClass('one-showable');
				if (key > (config.minified-1)) {
					div.hide();
				}
			}
			else {
				div.hide();
			}
		}
		if (config.entity == 'song_post') {
			_.each(config.tracks, function (story, key) {
				var div = $('<div>')
				.addClass('reddit-box song')
				.addClass('reddit-box-submission-with-cover')

				// Add recognized label
				div.addClass(story.info.ytid ? 'recognized' : 'not-recognized');

				// Add data-* properties
				_.each(story.info, function (value, k) {
					div.attr('data-' + k, value);
				});
				var vote_module = $('<div class="vote-module">').attr('data-vote', story.vote);
				var upvote_post = $('<div class="upvote-post">').attr('data-slug', story.slug).attr('data-sub', story.sub).appendTo(vote_module);
				$('<div class="upvote-count">').text(story.vote_count).appendTo(vote_module);
				var downvote_post = $('<div class="downvote-post">').attr('data-slug', story.slug).attr('data-sub', story.sub).appendTo(vote_module);

				$('<img>').attr('src', '/api/i/pixel').addClass('svg-upvote-black').appendTo(upvote_post);
				$('<img>').attr('src', '/api/i/pixel').addClass('svg-downvote-black').appendTo(downvote_post);

				if (chinchilla.loggedin) {
					var in_library = _.contains(oneTune.library(), story.info.id);
					div.addClass(in_library ? 'in-library' : 'not-in-library');

					if (story.upvoted) { upvote_post.addClass('upvoted'); }
					if (story.downvoted) { downvote_post.addClass('downvoted'); }
				}
				vote_module.appendTo(div);
				showable(div, config, key);
				div.appendTo(track_table);
				var redditbox = $('<div>').addClass('reddit-info-box');
				var playbutton = $('<div>').addClass('visual-play-button recognized findandplay').attr('data-id', story.info.id).appendTo(redditbox);
				$('<div>').addClass('play-icon').appendTo(playbutton);

				var img = $('<img>').addClass('one-story-cover').attr('src', story.info.image).appendTo(div);

				// Add track name
				$('<span>').addClass('reddit-song-name').html(helpers.parsetext(story.info.name)).attr('data-navigate', '/one/' + story.sub + '/' + story.slug + '/' + story.url).appendTo(redditbox);
				$('<br>').appendTo(redditbox);

				// Artist name
				var artist = $('<span>').addClass('reddit-song-artist').attr('data-navigate', '/artist/' + story.info.artistid).text(story.info.artist).appendTo(redditbox);
				$('<br>').appendTo(redditbox);
				$('<span>').addClass('reddit-song-user').attr('data-navigate', '/one/' + story.sub + '/' + story.slug + '/' + story.url).text(story.comments + ' '+ (story.comments == 1 ? 'comment' : 'comments')).appendTo(redditbox);
				$('<span>').addClass('reddit-song-user').text(' - '+story.timestamp).appendTo(redditbox);
				$('<span>').addClass('reddit-song-user').text(' to ').appendTo(redditbox);
				$('<span>').addClass('reddit-song-user').attr('data-navigate', '/one/' + story.sub).text(story.sub).appendTo(redditbox)

				redditbox.appendTo(div);
			});
		}
		if (config.entity == 'story') {
			_.each(config.tracks, function (story, key) {
				var div = $('<div>')
				.addClass('reddit-box')
				.addClass('reddit-box-story')

				var vote_module = $('<div class="vote-module">').attr('data-vote', story.vote);
				var upvote_post = $('<div class="upvote-post">').attr('data-slug', story.slug).attr('data-sub', story.sub).appendTo(vote_module);
				$('<div class="upvote-count">').text(story.vote_count).appendTo(vote_module);
				var downvote_post = $('<div class="downvote-post">').attr('data-slug', story.slug).attr('data-sub', story.sub).appendTo(vote_module);

				$('<img>').attr('src', '/api/i/pixel').addClass('svg-upvote-black').appendTo(upvote_post);
				$('<img>').attr('src', '/api/i/pixel').addClass('svg-downvote-black').appendTo(downvote_post);

				if (chinchilla.loggedin) {
					if (story.upvoted) { upvote_post.addClass('upvoted'); }
					if (story.downvoted) { downvote_post.addClass('downvoted'); }
				}
				vote_module.appendTo(div);
				showable(div, config, key);
				div.appendTo(track_table);
				var redditbox = $('<div>').addClass('reddit-info-box');
				$('<span>').addClass('reddit-song-name').html(story.title).attr('data-navigate', '/one/' + story.sub + '/' + story.slug + '/' + story.url).appendTo(redditbox);
				$('<br>').appendTo(redditbox);
				$('<span>').addClass('reddit-song-user').text(story.user).appendTo(redditbox);
				$('<br>').appendTo(redditbox);
				$('<span>').addClass('reddit-song-user').attr('data-navigate', '/one/' + story.sub + '/' + story.slug + '/' + story.url).text(story.comments + ' '+ (story.comments == 1 ? 'comment' : 'comments')).appendTo(redditbox);
				$('<span>').addClass('reddit-song-user').text(' - ' + story.timestamp).appendTo(redditbox);
				$('<span>').addClass('reddit-song-user').text(' to ').appendTo(redditbox);
				$('<span>').addClass('reddit-song-user').attr('data-navigate', '/one/' + story.sub).text(story.sub).appendTo(redditbox)
				redditbox.appendTo(div);
			});
		}
		if (config.entity == 'playlist') {
			_.each(config.tracks, function (story, key) {
				var div = $('<div>')
				.addClass('reddit-box')
				.addClass('reddit-box-playlist')

				var vote_module = $('<div class="vote-module">').attr('data-vote', story.vote);
				var upvote_post = $('<div class="upvote-post">').attr('data-slug', story.slug).attr('data-sub', story.sub).appendTo(vote_module);
				$('<div class="upvote-count">').text(story.vote_count).appendTo(vote_module);
				var downvote_post = $('<div class="downvote-post">').attr('data-slug', story.slug).attr('data-sub', story.sub).appendTo(vote_module);

				$('<img>').attr('src', '/api/i/pixel').addClass('svg-upvote-black').appendTo(upvote_post);
				$('<img>').attr('src', '/api/i/pixel').addClass('svg-downvote-black').appendTo(downvote_post);


				if (chinchilla.loggedin) {
					if (story.upvoted) { upvote_post.addClass('upvoted'); }
					if (story.downvoted) { downvote_post.addClass('downvoted'); }
				}
				vote_module.appendTo(div);
				showable(div, config, key);
				div.appendTo(track_table);
				var twobytwo = $('<div>').addClass('twobytwocovers');
				_.each(story.thumbnails, function (thumb) {
					$('<img>').attr('src', thumb).appendTo(twobytwo);
				})
				twobytwo.appendTo(div);
				var redditbox = $('<div>').addClass('reddit-info-box');
				$('<span>').addClass('reddit-song-name').html(story.title).attr('data-navigate', story.playlist).appendTo(redditbox);
				$('<br>').appendTo(redditbox);
				$('<span>').addClass('reddit-song-user').text(story.user).appendTo(redditbox);
				$('<br>').appendTo(redditbox);
				$('<span>').addClass('reddit-song-user').text(story.comments + ' '+ (story.comments == 1 ? 'comment' : 'comments')).attr('data-navigate', '/one/' + story.sub + '/' + story.slug + '/' + story.url).appendTo(redditbox);
				$('<span>').addClass('reddit-song-user').text(' - '+story.timestamp).appendTo(redditbox);
				$('<span>').addClass('reddit-song-user').text(' to ').appendTo(redditbox);
				$('<span>').addClass('reddit-song-user').attr('data-navigate', '/one/' + story.sub).text(story.sub).appendTo(redditbox)
				redditbox.appendTo(div);
			});
		}
		if (config.entity == 'public_playlist') {
			_.each(config.tracks, function (story, key) {
				var div = $('<div>')
				.addClass('reddit-box')
				.addClass('reddit-box-public-playlist reddit-box-playlist')

				showable(div, config, key);
				div.appendTo(track_table);
				var twobytwo = $('<div>').addClass('twobytwocovers');
				_.each(story.thumbnails, function (thumb) {
					$('<img>').attr('src', thumb).appendTo(twobytwo);
				})
				twobytwo.appendTo(div);
				var redditbox = $('<div>').addClass('reddit-info-box reddit-info-box-playlist');
				$('<span>').addClass('reddit-song-name').html(story.name).attr('data-navigate', story.url).appendTo(redditbox);
				$('<br>').appendTo(redditbox);
				$('<span>').addClass('reddit-song-user').html(story.tracks.length + " tracks").appendTo(redditbox);
				redditbox.appendTo(div);
			});
		}
		if (config.entity == 'song') {
			_.each(config.tracks, function (track, key) {
				// Create a row for each track
				var div = $('<div>')
				.addClass('song reddit-box');

				showable(div, config, key);
				// Check if it is in library
				// Skip if user is not logged in
				if (chinchilla.loggedin) {
					var in_library = _.contains(oneTune.library(), track.id);
					div.addClass(in_library ? 'in-library' : 'not-in-library');
				}

				// Add recognized label
				div.addClass(track.ytid ? 'recognized' : 'not-recognized');

				// Add data-* properties
				_.each(track, function (value, k) {
					div.attr('data-' + k, value);
				});

				// Add thumbnail
				var img = $('<img>').attr('src', track.image).appendTo(div);
				// Add inline actions
				var inline = $('<div>').addClass('inline-actions');
				if (chinchilla.loggedin) {
					$('<div>').addClass('heart').appendTo(inline);
				}
				inline.appendTo(div);

				// Add info box
				var redditbox = $('<div>').addClass('reddit-info-box');
				var playbutton = $('<div>').addClass('visual-play-button recognized findandplay').attr('data-id', track.id).appendTo(redditbox);
				$('<div>').addClass('play-icon').appendTo(playbutton);
				redditbox.appendTo(redditbox);

				// Add track name
				$('<span>').addClass('reddit-song-name').html(helpers.parsetext(track.name)).attr('data-navigate', '/song/' + track.id).appendTo(redditbox);
				$('<br>').appendTo(redditbox);

				// Artist name
				var artist = $('<span>').addClass('reddit-song-artist').attr('data-navigate', '/artist/' + track.artistid).text(track.artist).appendTo(redditbox);
				redditbox.appendTo(div);
				div.appendTo(track_table);
			});
		}
		track_table.appendTo(container);
		if (config.minified <= config.tracks.length) {
			$('<div>').addClass('one-show-more').text('Show more...').one('click', function () {

				$(track_table).find('.reddit-box.one-showable').show();
				console.log(config);
				if (config.represents) {
					$(this).one('click', function() {
						navigation.to(config.represents);
					}).text('Show all')
				}
			}).appendTo(container);
		}

		return container;
	}
}