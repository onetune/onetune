one = {
	buildHomePage: function (config) {
		$('#view[data-route="/one/'+config.one+'"]').empty();
		var table = $('<table>');
		var tr = $('<tr>').addClass('subtune-layout-table').appendTo(table);

		if (config.header) {
			$('#view[data-route="/one/'+config.one+'"]').append(config.header);
		}

		var stories = tracklist.build({
			tracks: config.stories,
			displayed: 8,
			represents: '/one/' + config.one + '/stories',
			title: 'Discussions',
			cover: 'placeholder',
			type: 'box',
			entity: 'story',
			submit: config.one,
			minified: 3
		});

		var songs = tracklist.build({
			tracks: config.songs,
			displayed: 16,
			represents: '/one/' + config.one + '/songs',
			title: 'Songs',
			cover: 'first_post',
			type: 'box',
			entity: 'song_post',
			submit: config.one,
			minified: 8
		});

		var playlists = tracklist.build({
			tracks: config.playlists,
			displayed: 16,
			represents: '/one/' + config.one + '/playlists',
			title: 'Playlists',
			cover: 'first_playlist',
			type: 'box',
			entity: 'playlist',
			submit: config.one,
			minified: 8
		});

		var itunes = tracklist.build({
			tracks: config.itunes_charts,
			displayed: 16,
			represents: '/one/' + config.one + '/charts',
			title: 'iTunes charts',
			cover: 'first',
			type: 'box',
			entity: 'song',
			minified: 8
		});

		var reddit = tracklist.build({
			tracks: config.reddit,
			displayed: 16,
			represents: '/r/' + config.sub.reddit,
			title: 'Top reddit tracks',
			cover: 'first',
			type: 'box',
			entity: 'song',
			minified: 8
		});

		var twocols = $('<div>').addClass('one-two-col');
		var col1 = $('<div>').addClass('one-col one-col-left').appendTo(twocols);
		var col2 = $('<div>').addClass('one-col one-col-right').appendTo(twocols);

		if (config.sub.description) {
			var desc_box = $('<div>').addClass('one-hello-box one-track-wrapper one-track-box')
			$('<div>').addClass('one-hello-content').text(config.sub.description).appendTo(desc_box);
			desc_box.appendTo(col1);
		}
		col1.append(stories);
		col2.append(songs);
		col1.append(playlists);
		if (config.itunes) {
			col2.append(itunes);
		}
		if (config.reddit.length > 0) {
			col1.append(reddit);
		}

		var container =
		$('<div>').addClass('one-page')
		.append(twocols);


		$('#view[data-route="/one/'+config.one+'"]').append(container);
		$.publish('speaker-icon-entered-dom')
		views.loadingindicator.hide();
	}
}