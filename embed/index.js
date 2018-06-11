var validators 		= require('../config/validators'),
	tracks 			= require('../config/tracks'),
	db				= require('../db/queries'),
	_ 				= require('underscore');

exports.initialize 	= function (app) {
	app.set('views', __dirname + '/html');

	var mount = st({ path: __dirname + '/public', url: '/embed/public', passthrough: false, cache: false});
	app.use(mount);

	app.get('/embed/song/:id', function (request, response) {
		var isValid = validators.checkIfSongId(request.params.id);
		if (isValid) {
			var afterTrackFetched = function (track_array) {
				if (track_array.length == 0) {
					response.render('error', {error: 'Track not found.'});
					return;
				}
				response.render('index', {
					song: track_array[0]
				});
			}
			tracks.getTracksFromAllSources([request.params.id], afterTrackFetched);
		}
		else {
			response.render('error', {error: 'Invalid track identifier.'});
		}
	});
	app.get('/embed/playlist', function (request, response) {
		var isValid = validators.checkIfValidPlaylistUrl(request.query.url);
		if (isValid) {
			db.getPlaylistByUrl(request.query.url, function (pl) {
				if (!pl) {
					response.render('error', {error: 'Playlist not found.'});
					return;
				}
				pl.username = validators.extractUsernameFromPlaylist(pl.url);
				console.log(pl, _.pick);
				var playlist = _.pick(pl, 'name', 'url', 'owner', 'username');
				db.getSongsByIdList(pl.tracks, function (tracks) {
					response.render('index', {
						playlist: playlist,
						tracks: tracks
					});
				});
			});
		}
		else {
			response.render('error', {error: 'Not a valid playlist URL.'});
		}
	});
	app.get('/embed/css', function (request, response) {
		response.sendfile('./embed/css/embed.css');
	});
}