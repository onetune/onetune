_.templateSettings.variable = "tmpl";
templates = {};
templates.buildLibrary = function(data) {
	var template = _.template(
		$('#template-library').html()
	)
	data.coverstack = 	helpers.coverArrayToHQ(
						_.first(_.pluck(data.tracks, 'image'),4)
					, 100)
	data.showartistalbum = true;
	data.rawduration = _.reduce(data.tracks, function(a, b) { return a + parseFloat(b.duration) }, 0)
	data.duration = helpers.parsehours(data.rawduration);
	data.trackcount = data.tracks.length;
	data.tracks = _.map(data.tracks, function(song) { song.inlib = true; return song; });
	data.tracklist 	= templates.buildTrackList(data);
	return template({data: data});
}
templates.buildPlaylist = function(data) {
	var template = _.template(
		$('#template-playlist').html()
	)
	data.coverstack = helpers.coverArrayToHQ(
						_.first(_.pluck(data.tracks, 'image'),4)
					, 100);
	data.showartistalbum = true;
	data.tracklist = templates.buildTrackList(data);
	data.playlist.rawduration = _.reduce(data.tracks, function(a, b) { return a + parseFloat(b.duration) }, 0)
	data.playlist.duration = helpers.parsehours(data.playlist.rawduration);
	data.playlist.trackcount = data.tracks.length;
	var output = template({data: data});
	return output;
}
templates.buildTrackList = function(data) {
	data.album = {cds: [[data.tracks]]}
	var template = _.template(
		$('#template-tracklist').html()
	)
	return template(data)
}
templates.buildSongsInList = function(tracks, flags) {
	data = {cd: tracks};
	var template = _.template(
		$('#template-song').html()
	)
	$.each(flags, function(key, val) {
		data[key] = val;
	})
	return template({data: data});
}
templates.buildSongContextMenu = function(data) {
	var playlists = oneTune.playlists();
	var playlistLocal = _.where(oneTune.playlists(), {url: data.represents})[0];
	data.isPlaylist = _s.contains(data.represents, '/u/') && _s.contains(data.represents, '/p/');
	console.log(playlistLocal, chinchilla.user);
	data.isOwner = playlistLocal ? (playlistLocal.owner == chinchilla.user) : false;
	data.isItunesTrack = !_.isNaN(parseInt(data.song.id));
	var template = _.template(
		$('#template-contextmenu').html()
	)
	return template({data: data});
}
templates.buildMultipleSongContextMenu = function(data) {
	data.isPlaylist = _s.contains(data.represents, '/u/') && _s.contains(data.represents, '/p/');
	data.allInLibrary = _.every(data.songs, function (track) { return _.contains(oneTune.library(), track) });
	data.noneInLibrary = _.every(data.songs, function (track) { return !_.contains(oneTune.library(), track) });
	data.ids_string = data.songs.join(',');
	var template = _.template(
		$('#template-contextmenu-multiple').html()
	)
	return template({data: data});
}
templates.buildSidebarQueue = function(data) {
	if (!player.queues.current) return;
	var template = _.template(
		$('#template-sidebar-queue').html()
	)
	return template(data);
}
templates.buildSidebarQueueEntry = function(data) {
	var template = _.template(
		['<div class="queue-entry <% if (data.special) { %> queue-entry-special <% } %>">',
		'	<img class="queue-entry-image" src="<%= helpers.getHQAlbumImage(data.song, 100) %>">',
		'	<p class="queue-entry-song"><%= data.song.name %></p>',
		'	<p class="queue-entry-artist"><%= data.song.artist %></p>',
		'</div>'].join('\n')
	)
	return template({data: data});
}

templates.buildQueue = function(data) {
	if (!data) return;
	var template = _.template(
		$('#template-single-queue').html()
	)
	return template(data);
}
templates.buildSongPage = function (data) {
	if (!data) return;
	var template = _.template(
		$('#song-page-template').html()
	)
	data.releaseyear = data.release.substr(0,4);
	return template({
		song: data,
		yt_page: (data.provider && data.provider == 'youtube') ? 'youtube-page' : '',
		headerimage: helpers.getHQAlbumImage(data, 1200),
		hqimage: helpers.getHQAlbumImage(data, 400),
		parseduration: helpers.parsetime,
		user: chinchilla.user,
		inlib: _.contains(oneTune.library(), data.id),
		playlists: oneTune.playlists()
	});
}
templates.buildNewSongPage = function() {
	return $('#template-v2-song-page').html();
}
templates.buildReport = function(data) {
	var template = _.template(
		$('#template-report').html()
	)
	return template(data);
}
templates.buildHome = function() {
	return $('#template-home').html();
}
templates.buildFilter 			= function(obj) {
	var afterTracksFetched = function(tracks) {
		var genres = _.groupBy(tracks, function (track) { return track.genre });
		var template = $('#template-filter').html();
		var dropdownfilter = $('.filter-dropdown');
		dropdownfilter.html(
			_.template(template, {data: genres})
		);
		_.each($('.filter-genre'), function (filter) {
			$(filter).on('change', function() {
				var activated = _.map($('.filter-genre:checked'), function (genre) { return $(genre).data('genre') });
				var songs = $('[data-represents="' + obj.list + '"] .song');
				if (activated.length == 0) {
					$(songs).show();
				}
				else {
					_.each(songs, function (song) {
						if (_.contains(activated, $(song).data('genre'))) {
							$(song).show();
						}
						else {
							$(song).hide();
						}
					});
				}
			});
		})
	}
	if (obj.list == '/library') {
		DB.getTracks({ids: oneTune.library(), callback: afterTracksFetched});
	}
	else {
		DB.getTracks({ids: _.where(oneTune.playlists(), {url: obj.list})[0].tracks, callback: afterTracksFetched});
	}
}
templates.buildFreebase 		= function(classname, title, text, citation, source) {
	return _.template([
		'<div class="freebase-info <%= data.classname %>">',
			'<h3><%= data.title %></h3>',
			'<p><%= data.text %><span><a target="_blank" href="<%= data.source %>"><%= data.citation %></a></span></p>',
		'</div>'
	].join('\n'), {data: {classname: classname, title: title, text: text, citation: citation, source: source}})
}