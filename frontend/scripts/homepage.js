homepage = {
	build: function (config) {
		$('#view').empty();
		var table = $('<table>');
		var tr = $('<tr>').addClass('subtune-layout-table').appendTo(table);

		$('#view[data-route="/home"]').append(config.header);

		if (chinchilla.loggedin) {
			var library = tracklist.build({
				tracks: config.library,
				displayed: 16,
				represents: '/library',
				title: 'Your library',
				cover: 'first',
				type: 'box',
				entity: 'song',
				minified: 8
			});
		}

		var charts = tracklist.build({
			tracks: config.charts,
			displayed: 8,
			represents: '/charts',
			title: 'Top charts',
			cover: 'first',
			type: 'box',
			entity: 'song',
			minified: 3
		});

		var retro  = tracklist.build({
			tracks: config.retro.charts,
			displayed: 8,
			represents: '/time-machine/' + config.retro.year,
			title: 'Time machine: ' + config.retro.year,
			cover: 'first',
			type: 'box',
			entity: 'song',
			minified: 5
		});

		var reddit = tracklist.build({
			tracks: _.pluck(config.reddit, 'song'),
			displayed: 8,
			represents: '/genres',
			title: 'Hot on Reddit',
			cover: 'first',
			type: 'box',
			entity: 'song',
			minified: 3
		});

		var song_post = tracklist.build({
			tracks: config.posts.song,
			displayed: 16,
			title: 'Top voted songs',
			represents: '/songs',
			cover: 'first_post',
			type: 'box',
			entity: 'song_post',
			submit: true,
			minified: 8
		});

		var stories = tracklist.build({
			tracks: config.posts.story,
			displayed: 16,
			title: 'Discussions',
			cover: 'placeholder',
			represents: '/stories',
			type: 'box',
			entity: 'story',
			submit: true,
			minified: 3
		});

		var playlists = tracklist.build({
			tracks: config.posts.playlist,
			displayed: 8,
			title: 'Playlists',
			cover: 'first_playlist',
			represents: '/playlists',
			type: 'box',
			entity: 'playlist',
			submit: config.one,
			minified: 3,
			submit: true
		});


		var twocols = $('<div>').addClass('one-two-col');
		var col1 = $('<div>').addClass('one-col one-col-left').appendTo(twocols);
		var col2 = $('<diV>').addClass('one-col one-col-right').appendTo(twocols);


		if (library) {
			col1.append(library);
		}
		col1.append(playlists);
		col2.append(song_post);
		col1.append(stories);
		col2.append(charts);
		col1.append(retro);
		col2.append(reddit);

		var container =
		$('<div>').addClass('one-page')
		.append(twocols);

		$('#view[data-route="/home"]').append(container);
		$.publish('speaker-icon-entered-dom');

		views.loadingindicator.hide();
	}
}