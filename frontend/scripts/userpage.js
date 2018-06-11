userpage = {
	buildHomePage: function (config) {
		$('#view').empty();
		var table = $('<table>');
		var tr = $('<tr>').addClass('subtune-layout-table').appendTo(table);

		$('#view').append("<div class='userpage-header'><h1>" + config.username + "</h1><h3>" + config.publicPlaylists.length + " Public Playlists | " + (config.playlists.length+config.songs.length+config.stories.length) + " Submissions</h3></div>");

		var stories = tracklist.build({
			tracks: config.stories,
			displayed: 8,
			title: 'Submitted Discussions',
			cover: 'placeholder',
			type: 'box',
			entity: 'story',
			minified: 3
		});

		var playlists = tracklist.build({
			tracks: config.playlists,
			displayed: 8,
			title: 'Submitted Playlists',
			cover: 'placeholder',
			type: 'box',
			entity: 'playlist',
			minified: 3
		});

		var publicPlaylists = tracklist.build({
			tracks: config.publicPlaylists,
			displayed: 8,
			title: 'Public Playlists',
			cover: 'placeholder',
			type: 'box',
			entity: 'public_playlist',
			minified: 3
		});


		var songs = tracklist.build({
			tracks: config.songs,
			displayed: 16,
			represents: '/user',
			title: 'Submitted Songs',
			cover: 'placeholder',
			type: 'box',
			entity: 'song_post',
			minified: 8
		});

		var twocols = $('<div>').addClass('one-two-col');
		var col1 = $('<div>').addClass('one-col one-col-left').appendTo(twocols);
		var col2 = $('<div>').addClass('one-col one-col-right').appendTo(twocols);

		col1.append(publicPlaylists);
		col2.append(songs);
		col1.append(stories);
		col2.append(playlists);

		var container =
		$('<div>').addClass('one-page')
		.append(twocols);


		$('#view[data-route="/u/'+config.username+'"]').append(container);
		views.loadingindicator.hide();
	}
}