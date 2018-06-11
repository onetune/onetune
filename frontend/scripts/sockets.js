var pladdfail = function(reason) {
	$('.new-playlist-input').hide();
	var error = $('<div>', {class: 'playlist-addition-failed'}).text(reason)
	error.prependTo('.playlists-menu').delay(3000).slideUp();
}
var pladded = function(data) {
	oneTune.playlists.push(data.playlist);
	$('.new-playlist-input').hide();
	$('.playlists-menu').prepend(data.div);
}
var plrenamed = function(data) {
	$('.new-playlist-input').hide();
	$('.playlists-menu .playlistmenuitem[data-navigate="' + data.old_url + '"]').attr('data-navigate', data.new_url)
	.find('.pl-label').text(data.new_name);
	oneTune.playlists(_.map(oneTune.playlists(), function (playlist) {
		if (playlist.url == data.old_url) {
			playlist.url = data.new_url;
			playlist.name = data.new_name;
		}
		return playlist;
	}));

	if ($('#view').data('route') == data.old_url) {
		$('#view').data('route', data.new_url);
		$('#view').find('h1').text(data.new_name);
		$('#view').find('[data-represents]').data('represents', data.new_url);
	}
	if (player.queues.current.represents == data.old_url) {
		player.queues.current.represents = data.new_url;
	}
	if (window.location.pathname == data.old_url) {
		window.history.replaceState({}, null, data.new_url);
	}
 }

var onTracksAdded = function (data) {
	var view = $('[data-route="/library"] .extendedtable .table-wrapper table')
	var table = view.find('tbody');
	$.each(data.divs, function (key, song) {
		var first = table.find('.song').eq(0)
		if (data.position == 'top' && first.length > 0) {
			$(first[0]).before(song);
		}
		else {
			$(song).appendTo(view);
		}
		$('.song[data-id="' + $(song).attr('data-id') + '"]').addClass('in-library animated').removeClass('not-in-library')
	});
	_.each(data.tracks, function (track) {
		oneTune.library.push(track + '');
	});
	notifications.create(data.notification)
	listChanged('/library');
}
var onTracksRemoved = function (data) {
	console.log('on library tracks removed', data);
	var table = $('[data-route="/library"]  .extendedtable tbody');
	$.each(data.tracks, function (key, song) {
		var song = table.find('[data-id="' + song + '"]').remove();
	});
	notifications.create(data.notification);
	_.each(data.tracks, function (track) {
		oneTune.library(_.without(oneTune.library(), track + ''));
		libdom.markAsNotInLibrary(track + '');
	});
	listChanged('/library');
}
var plremoved = function (data) {
	$("#sidebar [data-navigate='" + data.url + "']").remove();
	if ($('#view').data('route') == data.url) {
		navigation.to('/');
	}
	if (player.queues.current.represents == data.url) {
		player.queues.current.represents = '/';
		player.queues.current.name = 'Deleted playlist';
	}
	if (window.location.pathname == data.url) {
		navigation.to('/');
	}
	oneTune.playlists(_.reject(oneTune.playlists(), function (playlist) { return playlist.url == data.url }));
}
var onNotification = function(data) {
	notifications.create(data.html)
}

function listChanged(v) {
	var view = $('[data-route="' + v + '"]')
	var trackcountlabel = view.find('.playlist-trackcount');
	var pldurationlabel = view.find('.playlist-duration');
	var trackslabel 	= view.find('.playlist-plural-singular-tracks');

	var songs 			= $(view).find('.song');
	var songcount 		= songs.length;
	var songs_duration 	= _.reduce(songs, function (memo, s) { return parseInt($(s).data('duration')) + memo }, 0);

	$(trackcountlabel).text(songcount);
	$(pldurationlabel).text(helpers.parsehours(songs_duration)).attr('data-duration', songs_duration);
	$(trackslabel).text(songs.length == 1 ? 'track' : 'tracks');
}
var onPlaylistTracksRemoved = function (data) {
	if (!data.view) {
		data.view = data.destination;
	}
	libdom.removeSongsFromPlaylistLocal(data.view, data.tracks)
	_.each(data.tracks, function (song) {
		$('[data-represents="'+data.view+'"]').find('.song[data-id="' + song + '"]').remove();
	});
	oneTune.playlists(_.map(oneTune.playlists(), function (pl) {
		if (pl.url == data.destination) {
			pl.tracks = _.reject(pl.tracks, function (t) { return _.contains(data.tracks, t); });
		}
		return pl;
	}));
	notifications.create(data.notification);
	listChanged(data.view);
	colors.getMostCommon(data.destination);
}
var onRegisterFailed = function (data) {
	$('.username-disable').prop('disabled', false);
	$('.username-availability-indicator').text(data.reason).removeClass('available').addClass('not-available');
}
var onRegisterSuccessful = function (data) {
	document.cookie = "token=" + data.token + "; expires=Fri, 31 Dec 9999 23:59:59 GMT 12:00:00 GMT; path=/";
	window.location.href = '/';
}
var onLoginSuccessful = function (data) {
	document.cookie = "token=" + data.token + "; expires=Fri, 31 Dec 9999 23:59:59 GMT 12:00:00 GMT; path=/";
	window.location.href = '/';
}
var onLoginFailed = function (data) {
	$('.login-submit').prop('disabled', false).text('Login')
	$('.login-fail-indicator').text(data.reason).removeClass('available').addClass('not-available');
}
var onMultiplePlaylistSongsAdded = function (data) {
	listChanged(data.view);
	var view = $('[data-route="' + data.view + '"] .extendedtable .album-tracks table')
	var table = view.find('tbody');
 	$.each(data.divs, function (key, div) {
		var first = table.find('.song').eq(0);
		if (data.position == 'top' && first.length > 0) {
			$(first[0]).before(div);
		}
		else {
			$(div).appendTo(view);
			$('.no-playlist-text').remove();
		}

	});
	libdom.addSongsToPlaylistLocal(data.view, data.tracks)
	_.each(data.songs, function(song) {
		DB.addTrack(song)
	});
	_.each(data.tracks, function (trackid) {
		$('[data-route="/song/' + trackid + '"]')
		.find("[data-url='" + data.view + "']")
			.removeClass("add-song-to-playlist-button not-in-playlist")
			.addClass("remove-song-from-playlist-button in-playlist contains-song")
			.find('.song-page-playlist-trackcount')
				.text(data.trackcount);
	});
	notifications.create(data.notification)
	listChanged(data.view)
	colors.getMostCommon(data.view);
}

//socket.on('/pairing/other-device-disconnected', function () {
//	console.log('Mobile disconnected');
//	chinchilla.paired = false;
//});
//socket.on('register-successful', onRegisterSuccessful);
//socket.on('login-successful', onLoginSuccessful);
//socket.on('/pairing/receive-action', function(data) {
//	switch (data.action) {
//		case 'play':
//			player.play();
//			break;
//		case 'pause':
//			player.pause();
//			break;
//		case 'previous':
//			player.playLast();
//			break;
//		case 'next':
//			player.playNext();
//			break;
//		default:
//			break;
//	}
//});
//socket.on('/pairing/registered', function (data) {
//	chinchilla.paired = data.code;
//});