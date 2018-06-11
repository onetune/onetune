/* global db */
/* global __dirname */
var swig 	= require('swig');
var _ 		= require('underscore');
_.string= require('underscore.string');
var yturl 	= require('get-youtube-id');
var jsonreq = require('jsonreq');
var validator = require('validator');
var _validate = require('../config/validators');
var analytics = require('../config/analytics');
var charts = require('../config/charts');
var workers = require('../config/workers');
var fb  	= require('../config/facebook');
var helpers = require('../frontend/scripts/helpers').helpers;
var dirup 	= __dirname.substr(0, __dirname.length - 7);
var languages = require('../config/languages');
var ytdl = require('ytdl-core');
var itunes = require('../config/itunes');
var recognition = require('../frontend/scripts/recognition').recognition;
var md5 = require('MD5');
var moment = require('moment');
var markdown = require('../config/markdown');
var external = require('../config/tracks');
var async = require('async');
var posts_helpers = require('../config/posts');
var YouTube = require('youtube-node');
var youtube = new YouTube();
var password_hash = require('password-hash');
youtube.setKey(process.env.YOUTUBE_KEY);
var notificationtemplates = {
	track_added: 	swig.compileFile(dirup + '/sites/notifications/track-added.html'),
	track_removed: 	swig.compileFile(dirup + '/sites/notifications/track-removed.html'),
	tracks_added: 	swig.compileFile(dirup + '/sites/notifications/tracks-added.html'),
	tracks_removed: swig.compileFile(dirup + '/sites/notifications/tracks-removed.html')
};
var menutemplates 		  = {
	playlist: 		swig.compileFile(dirup + '/sites/playlistmenuitem.html'),
	playlistdialog: swig.compileFile(dirup + '/sites/add-playlist-dialog.html')
};
var musictemplates 		  = {
	track: 			swig.compileFile(dirup + '/sites/song.html')
};
var commenttemplates 	  = {
	comment: 		swig.compileFile(dirup + '/sites/comment.html')
};

exports.sendResponse = function(request, response, data) {
	/*
		This sends a JSON-encoded object to the client.
		@param response: A express response object
		@param data: Any Javascript object or array (should use object though for security reasons)
	*/
	response.set("Content-Type", "application/json");
	response.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0, proxy-revalidate, s-maxage=0');
	response.set('Expires', '0');
	response.set('Pragma', 'no-cache');
	response.set('Vary', '*');
	var json_string = JSON.stringify(data);
	var md5_hash = md5(json_string);
	var md5_client = request.get('If-None-Match');
	if (md5_client == md5_hash) {
		response.statusCode = 304;
	}
	response.set('ETag', md5_hash);
	response.end(json_string);
};
exports.sendError = function(request, response, error) {
	exports.sendResponse(request, response, {
		success: false,
		msg: error
	});
}
exports.newTrack = function(request, response) {
	/*
		/api/new-track
		Client found new track and uploads it to the server.
		Only used for import feature.
		request.query contains a song object.
	*/
	var data = request.query;
	if (!data) return;
	var track = data;
	if (!track.id) return;
	track.id += '';
	db.addTrack(track, function() {
		exports.sendResponse(request, response, {
			success: true,
			socket: 'track-uploaded',
			socket_body: track.id
		});
	});
}
exports.addPlaylist = function(request, response) {
	/*
		/api/playlists/create
		Used for creating new playlists.
		request.query contains a playlist creation object:
		{
			name: [String],
			token: [String]
		}
	*/
	var data = request.query;
	if (!data || !data.name || !data.token) return;
	var afterUserFetched = function(user) {
		if (user) {
			fb.addPlaylist(data.name, user, afterPlaylistCreationEvaluated);
		}
		else {
			exports.sendResponse(request, response, {
				success: false,
				socket: 'playlist-addition-failed',
				socket_body: 'You need to be logged in to create playlists.'
			});
		}
	}
	var afterPlaylistCreationEvaluated = function(state, playlist) {
		if (!state.fail) {
			var div = menutemplates.playlist({playlist: playlist});
			exports.sendResponse(request, response, {
				success: true,
				socket: 'playlist-added',
				socket_body: {div: div, playlist: playlist, name: data.name}
			});
		}
		else {
			exports.sendResponse(request, response, {
				success: false,
				socket: 'playlist-addition-failed',
				socket_body: state.fail
			});
		}
	}
	db.getUser(data.token, afterUserFetched);
}
exports.updateSettings = function (request, response) {
	/*
		/api/settings/update
		request.query contains all settings.
	*/
	var data = request.query;
	if (!data) return;
	db.updateSettings(data, function () {
		exports.sendResponse(request, response, {
			success: true
		});
	})
}
exports.deletePlaylist = function(request, response) {
	/*
		/api/playlists/delete
		request.query contains 2 fields:
		{
			url: [String],
			token: [String]
		}
	*/
	var data = request.query;
	if (!data || !data.url || !data.token) return;
	var afterUserFetched = function(user) {
		if (user) {
			fb.deletePlaylist(data.url, user, afterPlaylistDeletionEvaluated);
		}
	}
	var afterPlaylistDeletionEvaluated = function(state) {
		if (!state.fail) {
			exports.sendResponse(request, response, {
				success: true,
				socket: 'playlist-removed',
				socket_body: {url: data.url}
			});
		}
	}
	db.getUser(data.token, afterUserFetched);
}
exports.followPlaylist = function (request, response) {
	/*
		/api/playlists/follow
		Used for following as well as unfollowing playlists.
		{
			url: [String],
			token: [String],
			follow: [Boolean] // false for unfollowing, true for following
		}
	*/
	var data = request.query;
	if (!data || !data.url || !data.token) return;
	var afterPlaylistFetched = function (playlist) {
		if (!playlist) {
			exports.sendResponse(request, response, {
				success: false,
				notification: 'This playlist doesn\'t exist.'
			});
			return;
		}
		if (!playlist.public) {
			exports.sendResponse(request, response, {
				success: false,
				notification: 'This playlist isn\'t public.'
			});
			return;
		}
		if (data.follow == 'true') {
			if (_.contains(playlist.followers, data.user.id)) {
				exports.sendResponse(request, response, {
					success: false,
					notification: 'You already follow this playlist.'
				});
				return;
			}
			if (!playlist.followers) {
				playlist.followers = [];
			}
			playlist.followers.push(data.user.id);
			data.menuitem = menutemplates.playlist({playlist: playlist});;
		}
		else {
			if (!_.contains(playlist.followers, data.user.id)) {
				exports.sendResponse(request, response, {
					success: false,
					notification: 'You didn\'t follow this playlist.'
				});
				return;
			}
			if (!playlist.followers) {
				playlist.followers = [];
			}
			playlist.followers = _.reject(playlist.followers, function (follower) {
				return follower == data.user.id;
			});
		}
		playlist.followers = _.uniq(playlist.followers);
		db.savePlaylist(playlist, function () {
			if (playlist.followers) {
				playlist.followercount = playlist.followers.length;
				delete playlist.followers;
			}
			playlist.following = data.follow == 'true';
			var tosend = {
				success: true,
				playlist: playlist
			}
			if (data.menuitem) {
				tosend.menuitem = data.menuitem;
			}
			exports.sendResponse(request, response, tosend);
		});
	}
	var afterUserFetched = function (user) {
		if (!user) {
			exports.sendResponse(request, response, {
				success: false,
				notification: 'You are not logged in.'
			});
			return;
		}
		data.user = user;
		db.getPlaylistByUrl(data.url, afterPlaylistFetched);
	}
	db.getUser(data.token, afterUserFetched);
}
exports.getPlaylistOptions = function(request, response) {
	/*
		Currently only contains 'newestattop' option.

	*/
	var data = request.query;
	if (!data || !data.playlist) return;
	var tmpl 	= swig.compileFile(dirup + '/sites/playlist-options.html');
	var render 	= function() {
		var output = tmpl(data);
		response.end(output)
	}
	var checkPlaylistOwner = function() {
		if (data.token) {
			fb.ownspl(data.playlist, data.token, afterPlaylistOwnerChecked);
		}
		else {
			getPlaylist();
		}
	}
	var afterPlaylistOwnerChecked = function(ownspl) {
		data.owns = ownspl;
		getPlaylist();
	}
	var getPlaylist = function() {
		db.getPlaylist(data.playlist, function(playlist) {
			data.playlist = playlist;
			render();
		});
	}
	checkPlaylistOwner();
}
exports.updatePlaylistStyle = function(request, response) {
	var data = request.body;
	if (!_.isString(data.playlist)) {
		return;
	}
	var accepted = _.pick(data, ['bgColor', 'primaryColor', 'secondaryColor', 'detailColor', 'dark', 'url', 'image', 'artist']);
	db.setPlaylistStyle(data.playlist, accepted, function () {
		exports.sendResponse(request, response, {
			success: true
		});
	});
}
exports.changePlaylistPrivacy = function(request, response) {
	var data = request.query;
	data['public'] = data['public'] == 'true' ? true : false;
	if (!data || !data.token) return;
	fb.ownspl(data.playlist, data.token, function (ownspl) {
		if (ownspl) {
			db.getPlaylist(data.playlist, function (playlist) {
				playlist['public'] = data['public'] == true ? true : false;
				db.savePlaylist(playlist);
				exports.sendResponse(request, response, {
					success: true
				});
			});
		}
	});
}
exports.reorderPlaylist = function (request, response) {
	var data = request.query;
	if (!data || !data.token || !data.url || !data.new_order) return;
	fb.ownspl(data.url, data.token, function (ownspl) {
		if (ownspl) {
			db.getPlaylist(data.url, function (playlist) {
				if (!playlist) {
					exports.sendResponse(request, response, {
						success: false,
						msg: 'This playlist does not exist.'
					});
				}
				var isSameTracks = _.difference(playlist.tracks, data.new_order);
				console.log(isSameTracks, data.new_order, playlist.tracks)
				if (isSameTracks.length == 0) {
					playlist.tracks = data.new_order;
					db.savePlaylist(playlist);
					exports.sendResponse(request, response, {
						success: true
					});
				}
				else {
					exports.sendResponse(request, response, {
						success: false,
						msg: 'The array of tracks does not match the playlist tracks.'
					});
				}
			});
		}
		else {
			exports.sendResponse(request, response, {
				success: false,
				msg: 'You don\'t own this playlist.'
			});
		}
	})
}
exports.renamePlaylist = function(request, response) {
	var data = request.query;
	if (!data || !data.token) return;
	var afterUserFetched = function(user) {
		if (user) {
			fb.renamePlaylist(data.oldname, data.newname, user, afterPlaylistRenameEvaluated)
		}
		else {
			exports.sendResponse(request, response, {
				success: false
			});
		}
	}
	var afterPlaylistRenameEvaluated = function(state, playlist) {
		if (!state.fail) {
			var div = menutemplates.playlist({playlist: playlist});
			exports.sendResponse(request, response, {
				success: true,
				socket: 'playlist-renamed',
				socket_body: {div: div, new_name: playlist.name, new_url: playlist.url, old_url: data.oldname}
			});
		}
		else {
			exports.sendResponse(request, response, {
				success: false,
				socket: 'playlist-renamed-failed',
				socket_body: state.fail
			});
		}
	}
	db.getUser(data.token, afterUserFetched);
}
exports.changePlaylistOrder = function(request, response) {
	var data = request.query;
	if (!data || !data.token) return;
	data.newestattop = data.newestattop == 'true' ? true : false
	if (data.token) {
		fb.ownspl(data.playlist, data.token, function(ownspl) {
			if (ownspl) {
				db.getPlaylist(data.playlist, function(playlist) {
					playlist.newestattop = data.newestattop;
					db.savePlaylist(playlist);
					exports.sendResponse(request, response, {
						success: true
					});
				});
			}
		});
	}
}
exports.removeTracksFromCollection = function(request, response) {
	var data = request.query;
	if (!data.token || !data.tracks || !_.isArray(data.tracks)) return;
	var	afterUserFetched = function (user) {
			if (user) {
				data.user = user;
				fetchUserCollections();
			}
			else {
				exports.sendResponse(request, response, {
					success: false,
					socket: 'notification',
					socket_body: 'To remove tracks you must be logged in. <span data-navigate="/register">Login</span>'
				});
			}
		},
		fetchUserCollections = function() {
			db.getUserCollections(data.user, afterGotCollection);
		},
		afterGotCollection = function(collections) {
			data.collections = collections;
			if (data.tracks.length == 0) {
				exports.sendResponse(request, response, {
					success: false,
					socket: 'notification',
					socket_body: 'You have selected no tracks to remove.'
				});
				return;
			}
			else if (!(data.type == 'library' || data.type == 'playlist')) {
				exports.sendResponse(request, response, {
					success: false,
					socket: 'notification',
					socket_body: 'You must remove the track from either the library or from a playlist.'
				});
				return;
			}
			else {
				data.tracks = _.compact(_.map(data.tracks, function (track) { return track + '' }));
				if (data.type == 'library') {
					data.collections.library = _.reject(data.collections.library, function (track) { return _.contains(data.tracks, track) });
					db.saveUserCollections(data.collections, function() {
						exports.sendResponse(request, response, {
							socket: 'multiple-playlist-songs-removed',
							success: true,
							socket_body: {
								notification: 'Removal successful.',
								tracks: data.tracks,
								destination: '/library'
							}
						});
					});
				}
				else {
					db.getPlaylistByUrl(data.destination, function (playlist) {
						if (playlist) {
							data.playlist = playlist;
							var userplaylists = _.pluck(data.collections.playlists, 'url');
							if (_.contains(userplaylists, data.destination)) {
								data.playlist.tracks = _.reject(data.playlist.tracks, function (track) { return _.contains(data.tracks, track) });
								db.savePlaylist(data.playlist, function() {
									exports.sendResponse(request, response, {
										socket: 'multiple-playlist-songs-removed',
										success: true,
										socket_body: {
											notification: 'Removal successful.',
											tracks: data.tracks,
											destination: data.destination
										}
									});
								});
							}
							else {
								exports.sendResponse(request, response, {
									success: false,
									socket: 'notification',
									socket_body: 'You have to own the playlist to delete songs from it.'
								});
							}
						}
						else {
							exports.sendResponse(request, response, {
								success: false,
								socket: 'notification',
								socket_body: 'Target playlist does not exist.'
							});
						}
					});
				}
			}
		}
	db.getUser(data.token, afterUserFetched);
}
exports.newYtid = function(request, response) {
	var data = request.query;
	if (!data) return;
	var track = data;
	if (!track.id || ! track.ytid) return;
	track.id += '';
	db.addYTID(track, function() {
		exports.sendResponse(request, response, {
			success: true,
			socket: 'track-uploaded',
			socket_body: track.id
		});
	});

}
exports.getPlaylist = function(request, response) {
	var data = request.query;

	if (!data.playlist) {
		exports.sendError(request, response, 'No playlist selected.'); return;
	}
	var afterUserFetched = function (user) {

		if (user) {
			data.user = user;
		}

		db.getPlaylist(data.playlist, afterPlaylistFetched);
	}
	var afterPlaylistFetched = function (playlist) {
		/*
			Error handlers
		*/
		if (!playlist) {
			exports.sendError(request, response, 'Playlist does not exist.'); return;
		}
		if (!data.user || playlist.owner != data.user.id) {
			if (!playlist.public) {
				exports.sendError(request, response, 'This playlist is private.'); return;
			}
		}

		/*
			Modify playlist object
		*/
		if (data.user) {
			playlist.following = _.contains(playlist.followers, data.user.username);
		}

		if (playlist.followers) {
			playlist.followercount = playlist.followers.length;
			delete playlist.followers;
		}
		if (!_.isNaN(parseInt(playlist.owner))) {
			playlist.creator = _validate.extractUsernameFromPlaylist(playlist.url);
		}
		else {
			playlist.creator = playlist.owner;
		}

		delete playlist._id;

		db.getSongsByIdList(playlist.tracks, function (tracks) {
			playlist.tracks = tracks;
			playlist.thumbnails = _.chain(playlist.tracks).first(4).map(function (image) { return helpers.getHQAlbumImage(image, 400) }).value()
			exports.sendResponse(request, response, {
				success: true,
				represents: playlist.url,
				playlist: playlist,
			});
		});
	}

	if (data.token && _.isString(data.token)) {
		db.getUser(data.token, afterUserFetched);
	}
	else {
		afterUserFetched();
	}
}
exports.getPlaylistTracks = function(request, response) {
	var data = request.query;
	if (data.token == 'false') {
		data.token = false;
	}
	db.getPlaylist(data.playlist, function (playlist) {
		if (!playlist) {
			exports.sendResponse(request, response, {
				success: false,
				error: 'does_not_exist',
			});
			return;
		}
		fb.ownspl(data.url, (data.token), function(ownspl) {
			if (ownspl || playlist.public) {
				if (playlist.followers) {
					playlist.followercount = playlist.followers.length;
					delete playlist.followers;
				}
				playlist.following = false;
				exports.sendResponse(request, response, {
					success: true,
					playlist: playlist
				});
			}
			else {
				exports.sendResponse(request, response, {
					success: false,
					error: 'not_public'
				})
			}
		});
	});
}
exports.sync = function (request, response) {
	var data = request.query;
	if (!data || !data.tracks || !data.token) {
		exports.sendResponse(request, response, {
			success: false,
			msg: 'No sync needed'
		})
	};
	data.tracks = data.tracks.split(',');
	var afterUserFetched = function(user) {
		if (user) {
			searchDatabase();
		}
	}
	var searchDatabase = function(timestamp) {
		db.getUpdates(data.tracks, data.lastSync, function (updates) {
			exports.sendResponse(request, response, updates);
		});
	}
	db.getUser(data.token, afterUserFetched);
}
exports.reportMetadata = function(request, response) {
	var data = request.body;
	if (!data || !data.fields_to_change || !data.song_to_change) return;
	var ytid = yturl(data.ytid);
	db.getSingleTrack(data.song_to_change, function (song) {
		var report = {},
			loadYouTube = function(old_video, new_video, callback) {
				jsonreq.get('https://gdata.youtube.com/feeds/api/videos/' + old_video + '?v=2&alt=json', function (err, youtube_reponse) {
					if (err) return;
					report.wrong_video = {
						id: report.track.ytid,
						title: youtube_reponse.entry.title.$t,
						uploader: youtube_reponse.entry.author[0].name.$t,
						user_id: youtube_reponse.entry.author[0].yt$userId.$t
					}
					jsonreq.get('https://gdata.youtube.com/feeds/api/videos/' + new_video + '?v=2&alt=json', function (err, yt_response) {
						if (err) return;
						report.suggestion = {
							id: report.fields_to_change.ytid,
							title: yt_response.entry.title.$t,
							uploader: yt_response.entry.author[0].name.$t,
							user_id: yt_response.entry.author[0].yt$userId.$t
						}
						callback();
					});
				});
			},
			save = function() {
				db.saveReport(report, function (success) {
					if (success) {
						exports.sendResponse(request, response, {
							success: true,
							socket: 'report-feedback',
							socket_body: {msg: 'Thanks!. We will have a look and update the video for all users!'}
						});
					}
					else {
						exports.sendResponse(request, response, {
							success: false,
							socket: 'report-feedback',
							socket_body: {msg: 'Sorry, our servers have some kind of a problem. The report wasn\'nt sent.'}
						});
					}
				});
			}
			if (song) {
				report.track = song[0];
				report.fields_to_change = data.fields_to_change
				if (report.fields_to_change.ytid) {
					if (!report.track.ytid) {
						exports.sendResponse(request, response, {
							success: false,
							socket: 'report-feedback',
							socket_body: {msg: 'We couldn\'t process the request because our own algorithm didn\'t find a video itself yet.'}
						});
						return;
					}
					if (report.track.ytid == ytid) {
						exports.sendResponse(request, response, {
							success: false,
							socket: 'report-feedback',
							socket_body: {msg: 'he video submitted was already fixed recently.'}
						});
						return;
					}
					loadYouTube(report.track.ytid, report.fields_to_change.ytid, save);
				}
				else {
					save()
				}
			}
		});
}
exports.usernameChosen = function (request, response) {
	var data = request.query;
	if (!data || !data.id || !_.isString(data.id) || !data.username || !_.isString(data.username)) return;
	db.checkIfUsernameIsTaken(data, function (exists) {
		if (!exists) {
			db.getProvisionalUser(data.id, function (user) {
				user.username = data.username;
				db.addUser(user, function () {
					exports.sendResponse(request, response, {
						token: user.token
					});
				});
			});
		}
	})
}
exports.getTracks = function (request, response) {
	var data = request.query;
	if (data && data.tracks && _.isArray(data.tracks)) {
		db.getSongsByIdList(data.tracks, function (tracks) {
			exports.sendResponse(request, response, {
				tracks: tracks
			});
		});
	}
}
exports.getTracksPost = function (request, response) {
	var data = request.body;
	if (!data.tracks || !_.isArray(data.tracks)) {
		exports.sendResponse(request, response, {
			success: false,
			msg: 'Need to pass a tracks array.'
		});
	}
	db.getSongsByIdList(data.tracks, function (tracks) {
		exports.sendResponse(request, response, {
			tracks: tracks
		});
	});
}
exports.login = function (request, response) {
	var data = request.body;
	if (!data || !data.username || !data.password || !_.isString(data.username) || !_.isString(data.password)) {
		return;
	}
	db.checkIfUsernameIsTaken(data.username, function (exists) {
		if (!exists) {
			exports.sendResponse(request, response, {
				success: false,
				socket: 'login-failed',
				socket_body: {reason: 'The username or password isn\'t correct.'}
			});
		}
		else {
			if (password_hash.verify(data.password, exists.password)) {
				exports.sendResponse(request, response, {
					success: true,
					socket: 'login-successful',
					socket_body: {token: exists.token}
				});
			}
			else {
				exports.sendResponse(request, response, {
					success: false,
					socket: 'login-failed',
					socket_body: {reason: 'The username or password isn\'t correct.'}
				});
			}
		}
	});
}
exports.register = function (request, response) {
	var data = request.query;
	if (!data || !data.email || !data.password || !data.username || !_.isString(data.username) || !_.isString(data.password) || !_.isString(data.email)) return;
	if (!validator.isEmail(data.email)) {
		exports.sendResponse(request, response, {
			success: false,
			socket: 'register-failed',
			socket_body: {reason: 'Not a valid email address.'}
		});
		return;
	}
	db.checkIfUsernameIsTaken(data.username, function (exists) {
		if (!data.username.match(/^[a-zA-Z0-9]+$/)) {
			exports.sendResponse(request, response, {
				success: false,
				socket: 'register-failed',
				socket_body: {reason: 'Your username can only contain letters and numbers.'}
			});
			return;
		}
		if (exists) {
			exports.sendResponse(request, response, {
				success: false,
				socket: 'register-failed',
				socket_body: {reason: 'The username was taken in the meantime. Please take another one.'}
			});
			return;
		}
		if (data.password.length < 6) {
			exports.sendResponse(request, response, {
				success: false,
				socket: 'register-failed',
				socket_body: {reason: 'Your password should be at least 6 characters long.'}
			});
			return;
		}
		fb.createAccountFromUserData(data, function (user) {
			exports.sendResponse(request, response, {
				success: true,
				socket: 'register-successful',
				socket_body: {token: user.token}
			});
		});
	});
}
exports.checkUsername = function (request, response) {
	var data = request.query;
	if (!data || !_.isString(data.username)) return;
	db.checkIfUsernameIsTaken(data.username, function (exist) {
		exports.sendResponse(request, response, {query: data, exists: !!exist});
	});
}
exports.getPlaylistMenu = function (request, response) {
	var data = request.query;
	if (!data || !data.token || !data.playlist) return;
	var tmpl 	= swig.compileFile(dirup + '/sites/playlist-contextmenu.html');
	var render	= function() {
		var output = tmpl(data);
		response.end(output);
	}
	fb.ownspl(data.playlist, data.token, function(ownspl) {
		data.owns = ownspl;
		db.getPlaylist(data.playlist, function(playlist) {
			data.playlist = playlist;
			render();
		});
	});
}
exports.addPlaylistDialogue = function(request, response) {
	var data = request.query;
	if (!data || !data.song || !data.token) return;
	fb.getUserPlaylists(data.token, function(playlists) {
		playlists = _.map(playlists, function(playlist) {
			playlist.inpl = (_.contains(playlist.tracks, data.song + ''));
			return playlist;
		});
		var output = menutemplates.playlistdialog({playlists: playlists, songid: data.song});
		response.end(output);
	});
}
exports.addTracksToCollectionPost = function (request, response) {
	exports.addTracksToCollection(request, response, true)
}
exports.addTracksToCollection = function (request, response, post) {
	var data = post == true ? request.body : request.query;
	if (!data.token) return;
	var tmpl = notificationtemplates.tracks_added,
		afterUserFetched = function (user) {
			if (user) {
				data.user = user;
				fetchUserCollections();
			}
			else {
				exports.sendResponse(request, response, {
					success: false,
					socket: 'notification',
					socket_body: 'To add tracks you must be logged in. <span data-navigate="/register">Login</span>'
				});
			}
		},
		fetchUserCollections = function() {
			db.getUserCollections(data.user, getSongs);
		},
		getSongs = function(collections) {
			data.collections = collections;
			if (data.tracks != undefined && _.isArray(data.tracks)) {
				if (data.tracks.length == 0) {
					exports.sendResponse(request, response, {
						success: false,
						socket: 'notification',
						socket_body: 'You have selected no tracks to add.'
					});
					return;
				}
				else if (!(data.type == 'library' || data.type == 'playlist')) {
					exports.sendResponse(request, response, {
						success: false,
						socket: 'notification',
						socket_body: 'You must add the track to either the library or to a playlist.'
					});
					return;
				}
				else {
        			analytics.recordAccess(request, response, {
        			  user: data.user,
        			  tracks: data.tracks,
        			  type: data.type,
        			});
					data.tracks = _.compact(_.map(data.tracks, function (track) { return track + '' }));
				}
				db.getSongsByIdList(data.tracks, afterSongsByIdListFetched);
			}
		},
		afterSongsByIdListFetched = function(songs) {
			data.songs = songs;
			checkForMissingTracksInDb(afterEnoughTrackInfoAvailable);
		},
		checkForMissingTracksInDb = function(callback) {
			if (data.songs.length != data.tracks.length) {
				var notindb = _.clone(data.tracks);
				_.each(data.songs, function (song) {
					notindb = _.without(notindb, song.id + '')
				});

				external.getTracksFromItunesandYouTube(notindb, function (songs) {
					data.songs = _.union(data.songs, songs);
					callback();
					db.addTracksBulk(songs);
				});
			}
			else {
				callback();
			}
		},
		renderDivs = function() {
			data.divs = _.map(data.songs, function (song) {
				var info = {};
					info.type 				= data.type;
					info.showartistalbum 	= true;
					info.cd 				= [song];
					info.user 				= data.user;
					info.parsetext 			= helpers.parsetext;
					info.parseduration 		= helpers.parsetime;
					var div = musictemplates.track(info);
					return div;
			});
			return data.divs;
		},
		afterEnoughTrackInfoAvailable = function() {
			data.songs = _.map(data.songs, function (song) {
				if (data.type == 'library') {
					if (_.include(data.collections.library, song.id + '')) return null;
					data.collections.library.push(song.id + '')
					song.inlib = true;
				}
				else {
					song.inlib = _.contains(data.collections.library, song.id + '')
				}
				return song;
			});
			data.songs = _.compact(data.songs);
			if (data.type == 'library') {
				data.collections.library = _.uniq(data.collections.library);
				renderDivs()
				var output = tmpl(data);
				db.saveUserCollections(data.collections, function(collection) {
					exports.sendResponse(request, response, {
						success: true,
						socket: 'tracks-added',
						socket_body: {
							divs: data.divs, position: 'top', notification: output, tracks: _.pluck(data.songs, 'id')
						}
					});
				});
			}
			else {
				db.getPlaylistByUrl(data.destination, function (playlist) {
					if (playlist) {
						data.playlist = playlist;
						var userplaylists = _.pluck(data.collections.playlists, 'url');
						_.map(data.songs, function (song) {
							if (!_.include(userplaylists, data.destination) || _.include(data.playlist.tracks, song.id + '')) {
								return null;
							}
							data.playlist.tracks.push(song.id + '');
							return song;
						});
						db.savePlaylist(data.playlist, function() {
							renderDivs();
							var output = tmpl(data);
							var diff = _.reduce(data.songs, function (a,b) { return a + b.duration }, 0);
							exports.sendResponse(request, response, {
								success: true,
								socket: 'multiple-playlist-songs-added',
								socket_body: {
									divs: data.divs,
									position: data.playlist.newestattop ? 'top' : 'bottom',
									view: data.destination, trackcount: playlist.tracks.length,
									lengthdifference: diff,
									notification: output,
									songs: _.compact(data.songs),
									tracks: _.pluck(data.songs, 'id')
								}
							});
						});
					}
					else {
						exports.sendResponse(request, response, {
							success: false,
							socket: 'notification',
							socket_body: 'Target playlist does not exist.'
						});
					}
				});
			}
		}
	db.getUser(data.token, afterUserFetched);
}
exports.retroCharts = function(request, response) {
  // TODO: normalize with other API get reqiests
	response.set("Access-Control-Allow-Origin", "*");
	response.set("Access-Control-Allow-Headers", "X-Requested-With");
  	response.set("Content-Type", "application/json");
	var start_time = Date.now();
	var data = {};
	var afterIdsFetched = function (chart) {
		if (chart) {
			data.year = chart.year;
			db.getSongsByIdList(chart.charts, afterChartsFetched);
		}
		else {
			exports.sendResponse(request, response, {
				success: false,
				error: 'Year does not exist'
			});
		}
	}
	var afterChartsFetched = function (table) {
		exports.sendResponse(request, response, {
			success: true,
			response_time_ms: Date.now() - start_time,
			track_count: table.length,
			year: data.year,
			tracks: table
		});
	}
	if (request.params.year == 'random') {
		var yearrange = workers.getYearRange();
		request.params.year = _.sample(yearrange);
	}
	db.getRetroCharts(request.params.year, afterIdsFetched);
}
exports.getCharts = function(request, response) {
	var afterChartsFetched = function(tracks) {
		exports.sendResponse(request, response, {
			success: true,
			represents: '/charts',
			tracks: tracks
		});
	}
	charts.getCharts(afterChartsFetched);
}
exports.getUserData = function(request, response) {
	var data = request.query;
	if (!data) return;
	if (!data.token) {
		exports.sendResponse(request, response, {
			success: false,
			msg: 'No token specified'
		});
		return;
	}
	var afterLibraryFetched = function(collections) {
		if (!collections) {
			exports.sendResponse(request, response, {
				success: false,
				msg: 'No collections found',
				config: chinchilla
			});
			return;
		}
		chinchilla.library = collections.library;
		if (!collections.playlists || collections.playlists.length == 0) {
			afterPlaylistsDone();
		}
		else {
			db.getPlaylistsFromUserId(data.user.id, afterPlaylistFetched);
		}
	}
	var afterPlaylistFetched = function(playlists) {
		chinchilla.playlists = _.map(playlists, function (playlist) {
			if (!playlist.followers) return playlist;
			playlist.followercount = playlist.followers.length;
			delete playlist.followers;
			return playlist;
		});
		db.getFollowedPlaylistsByUserId(chinchilla.user_info.id, afterFollowedPlaylistsFetched);
	}
	var afterFollowedPlaylistsFetched = function(playlists) {
		chinchilla.followed_playlists = _.map(playlists, function (playlist) {
			if (!playlist.followers) return playlist;
			playlist.followercount = playlist.followers.length;
			delete playlist.followers;
			playlist.following = true;
			return playlist;
		});
		afterPlaylistsDone();
	}
	var afterPlaylistsDone = function() {
		exports.sendResponse(request, response, {
			success: true,
			config: chinchilla
		});
	}
	var afterUserFetched = function(user) {
		if (user) {
			data.user = user;
			chinchilla.user = user.id;
			chinchilla.user_info = user;
			_.each(user.settings, function (setting)  { chinchilla.settings[setting.key] = setting.value  } )
			db.getUserCollections(user, afterLibraryFetched)
		}
		else {
			exports.sendResponse(request, response, {
				success: false,
				msg: 'Token is invalid',
				config: chinchilla
			});
		}
	}
	db.getUser(data.token, afterUserFetched);
	var chinchilla = {
		playlists: [],
		settings: {},
		loggedin: true,
		user: null,
		token: data.token
	}
}
exports.changeCommentVote = function(request, response) {
	var data = request.body;
	if (!data) return;
	if (!data.token) {
		exports.sendResponse(request, response, {
			success: false,
			msg: 'You are not logged in.'
		});
		return;
	}
	var afterCommentFetched = function(comment) {
		if (comment) {
			data.comment = comment;
			var up_count = data.comment.upvoters.length;
			var down_count = data.comment.downvoters.length;
			if (data.vote === "1") {
				data.comment.upvoters.push(data.user.username);
				data.comment.upvoters = _.uniq(data.comment.upvoters)
				data.comment.downvoters = _.compact(_.reject(data.comment.downvoters, function (downvoter) { return downvoter == data.user.username }));
			}
			else if (data.vote === "-1") {
				data.comment.downvoters.push(data.user.username);
				data.comment.downvoters = _.uniq(data.comment.downvoters);
				data.comment.upvoters = _.compact(_.reject(data.comment.upvoters, function (upvoter) { return upvoter == data.user.username }));
			}
			else {
				data.comment.downvoters = _.compact(_.reject(data.comment.downvoters, function (downvoter) { return downvoter == data.user.username }));
				data.comment.upvoters = _.compact(_.reject(data.comment.upvoters, function (upvoter) { return upvoter == data.user.username }));
			}
			var moreupvotes = data.comment.upvoters.length - up_count;
			var moredownvotes = data.comment.downvoters.length - down_count;
			data.comment.score = data.comment.score + moreupvotes - moredownvotes;
			db.updateComment(data.comment, function() {
				exports.sendResponse(request, response, {
					success: true
				});
			});
      analytics.recordVote(data.user && data.user._id, request.url, data.vote);
		}
		else {
			exports.sendResponse(request, response, {
				success: false,
				msg: 'Comment not found. Cannot vote on it.'
			});
		}
	}
	var afterUserFetched = function(user) {
		if (user) {
			data.user = user;
			db.getComment(data.comment, afterCommentFetched);
		}
	}
	db.getUser(data.token, afterUserFetched);
}
exports.changeVote = function(request, response) {
	var data = request.query;
	if (!data) return;
	if (!data.token) {
		exports.sendResponse(request, response, {
			success: false,
			msg: 'You are not logged in.'
		});
		return;
	}
	var afterPostFetched = function (post) {
		if (post) {
			data.post = post;
			var up_count = data.post.upvoters.length;
			var down_count = data.post.downvoters.length;
			if (data.vote === "1") {
				data.post.upvoters.push(data.user.username);
				data.post.upvoters = _.uniq(data.post.upvoters)
				data.post.downvoters = _.compact(_.reject(data.post.downvoters, function (downvoter) { return downvoter == data.user.username }));
			}
			else if (data.vote === "-1") {
				data.post.downvoters.push(data.user.username);
				data.post.downvoters = _.uniq(data.post.downvoters);
				data.post.upvoters = _.compact(_.reject(data.post.upvoters, function (upvoter) { return upvoter == data.user.username }));
			}
			else {
				data.post.downvoters = _.compact(_.reject(data.post.downvoters, function (downvoter) { return downvoter == data.user.username }));
				data.post.upvoters = _.compact(_.reject(data.post.upvoters, function (upvoter) { return upvoter == data.user.username }));
			}
			var moreupvotes = data.post.upvoters.length - up_count;
			var moredownvotes = data.post.downvoters.length - down_count;
			data.post.vote_count = data.post.vote_count + moreupvotes - moredownvotes;
			db.savePost(data.post, function () {
				exports.sendResponse(request, response, {
					success: true
				});
			})
      analytics.recordVote(data.user && data.user._id, request.url, data.vote);
		}
		else {
			exports.sendResponse(request, response, {
				success: false,
				msg: 'Post does not exist.'
			});
			return;
		}
	}
	var afterUserFetched = function (user) {
		if (user) {
			data.user = user;
			db.getPost(data.sub, data.slug, afterPostFetched);
		}
		else {
			exports.sendResponse(request, response, {
				success: false,
				msg: 'Invalid user.'
			});
			return;
		}
	}
	db.getUser(data.token, afterUserFetched);
}
exports.getOne = function(request, response) {
  var data = {};
  analytics.recordAccess(request, response);

	var sub = workers.getSub(request.params.one);
	if (!sub) {
		exports.sendResponse(request, response, {
			success: false,
			msg: 'Sub does not exist'
		});
		return;
	}
	var reddit = workers.returnRedditSongs(sub.reddit);
	var stories = [], songs = [], playlists = [];
	var mapSubmissions = function (submissions) {
		return _.map(submissions, function (submission) {
			submission.timestamp = moment(submission.date).fromNow();

			return submission;
		});
	}
	var getStories = function() {
		db.getPosts(sub.name, afterStoriesFetched, {type: 'story', ranking: 'top', after: 0})
	}
	var afterStoriesFetched = function(db_stories) {
		stories = mapSubmissions(db_stories);
		getPlaylists();
	}
	var getPlaylists = function () {
		db.getPosts(sub.name, afterPlaylistFetched, {type: 'playlist', ranking: 'top', after: 0});
	}
	var afterPlaylistFetched = function (db_playlists) {
		playlists = mapSubmissions(db_playlists);
		getSongs();
	}
	var getSongs = function () {
		db.getPosts(sub.name, afterSongsFetched, {type: 'song', ranking: 'top', after: 0});
	}
	var afterSongsFetched = function (db_songs) {
		db.getSongsByIdList(_.pluck(db_songs, 'song'), function (_songs) {
			var tracks = _.map(db_songs, function (post) {
				post.info = _.find(_songs, function (s) {
					return s.id == post.song
				});
				return post;
			});
			songs = mapSubmissions(tracks);
			render();
		});
	}
	var render = function() {
		sub.type = 'home';
		exports.sendResponse(request, response, {
			success: true,
			one: request.params.one,
			sub: sub,
			stories: stories,
			reddit: _.pluck(reddit, 'song'),
			songs: songs,
			playlists: playlists,
			itunes_charts: charts.genres[sub.itunes],
			header: swig.compileFile('./sites/subtune-header.html')(sub)
		});
	}
	var afterUserFetched = function (user) {
		if (user) {
			data.user = user;
		}
		getStories();
	}
	if (_.isString(request.query.token)) {
		db.getUser(request.query.token, afterUserFetched);
	}
	else {
		getStories();
	}
}
exports.getUser = function(request, response) {
	var data = {};
	var _internaldata = {};
	var userIDfromPage;
	var mapSubmissions = function (submissions) {
		return _.map(submissions, function (submission) {
			if (_internaldata.user) {
				submission.upvoted = _.contains(submission.upvoters, _internaldata.user.username);
				submission.downvoted = _.contains(submission.downvoters, _internaldata.user.username);
				submission.vote = submission.upvoted ? 1 : (submission.downvoted ? -1 : 0);
			}
			submission.timestamp = moment(submission.date).fromNow();
			submission = _.pick(submission, 'entity', 'title', 'sub', 'slug', 'url', 'user', 'vote_count', 'comments', 'upvoted', 'downvoted', 'vote', 'timestamp', 'song', 'info', 'playlist', 'thumbnails');
			return submission;
		});
	}
	var getPosts = function() {
		db.getPostsByUser(request.params.username, afterPostsFetched)
	}
	var afterPostsFetched = function(db_stories) {
		data.posts = mapSubmissions(db_stories);
		var groups = _.groupBy(data.posts, function (post) { return post.entity });
		data.stories = groups.story;
		data.songs = groups.song;
		data.playlists = groups.playlist;
		getPublicPlaylists();
	}
	var getPublicPlaylists = function() {
		db.getUserByUsername(request.params.username, function (userObject) {
			if (!userObject) {
				exports.sendResponse(request, response, {
					success: false,
					msg: "User not found"
				})
			}
			userIDfromPage = userObject.id;
			db.getPublicPlaylistsFromUserId(userIDfromPage, function (playlists) {
				data.publicPlaylists = playlists;
				/*
					Get some covers
				*/
				var songids = _.chain(data.publicPlaylists).pluck('tracks').map(function (a) { return _.first(a, 4) }).flatten().value();
				db.getSongsByIdList(songids, function (songs_from_playlists) {
					data.publicPlaylists = _.map(data.publicPlaylists, function (pl) {
						pl.thumbnails = [];
						var first4 = _.first(pl.tracks, 4);
						_.each(first4, function (song_to_get_thumbnail) {
							var song = _.findWhere(songs_from_playlists, {id: song_to_get_thumbnail});
							pl.thumbnails.push(song.image);
						});
						return pl;
					});
				});
				afterSongsFetched(data.songs);
			});
		})
	}
	var afterSongsFetched = function (db_songs) {
		db.getSongsByIdList(_.pluck(db_songs, 'song'), function (_songs) {
			var tracks = _.map(db_songs, function (post) {
				post.info = _.find(_songs, function (s) {
					return s.id == post.song
				});
				return post;
			});
			data.songs = tracks;
			render();
		});
	}
	var render = function() {
		data.success = true;
		exports.sendResponse(request, response, data)
	}
	var afterUserFetched = function(user) {
		_internaldata.user = user;
		getPosts()
	}
	db.getUser(request.query.token, afterUserFetched)
}
exports.getYouTubeURL = function(request, response) {
	var date = Date.now();
	ytdl.getInfo('https://www.youtube.com/watch?v=' + request.params.id, {downloadURL: true}, function (err, info) {
		console.log('Error:', err, 'info:', info);
		var duration = Date.now() - date;
		exports.sendResponse(request, response, {
			formats: info.formats,
			duration: duration
		});
	});
}
exports.changeLang = function(request, response) {
	var data = request.query;
	if (!data || !data.lang || !_.isString(data.lang)) return;
	languages.setLanguage(data.lang, request, response);
	exports.sendResponse(request, response, {
		success: true
	});
}
exports.deletePost = function(request, response) {
	var data = request.body;
	if (!_.isString(data.token)) return;
	if (!_.isString(data.post)) return;

	var afterUserFetched = function (user) {
		if (!user) {
			exports.sendResponse(request, response, {
				success: false,
				msg: 'You are not logged in'
			});
			return;
		}
		db.getPostById(data.post, afterPostFetched);
		data.user = user;
	}
	var afterPostFetched = function (post) {
		if (!post) {
			exports.sendResponse(request, response, {
				success: false,
				msg: 'This post was already remvoed.'
			});
			return;
		}
		if (post.user == data.user.username) {
			db.deletePost(post);
			exports.sendResponse(request, response, {
				success: true
			});
		}
	}
	db.getUser(data.token, afterUserFetched);
}
exports.deleteComment  	= function (request, response) {
	var data = request.body;
	if (!_.isString(data.token)) return;
	if (!_.isString(data.comment)) return;

	var afterUserFetched = function(user) {
		if (!user) {
			exports.sendResponse(request, response, {
				success: false,
				msg: 'You are not logged in.'
			});
			return;
		}
		data.user = user;
		db.getComment(data.comment, afterCommentFetched);
	}
	var afterCommentFetched = function(comment) {
		if (!comment) {
			exports.sendResponse(request, response, {
				success: false,
				msg: 'This comment doesn\'t exist anymore'
			});
			return;
		}
		data.comment = comment;
		if (data.comment.submitter == data.user.username) {
			delete data.comment.content;
			delete data.comment.submitter;
			db.updateComment(data.comment, function () {
			});
			exports.sendResponse(request, response, {
				success: true
			});
			db.getPostBySlug(data.comment.post, function (post) {
				console.log(post);
				if (post) {
					post.comments--;
					db.savePost(post);
				}
			});
		}
		else {
			exports.sendResponse(request, response, {
				success: false,
				msg: 'You did not write this comment.'
			});
			return;
		}

	}
	db.getUser(data.token, afterUserFetched);
}
exports.submitComment = function(request, response) {
	var data = request.body,
		submitobj = {}
	if (!data) return;
	if (!data.content || data.content == '') {
		exports.sendResponse(request, response, {
			success: false,
			msg: 'You need to enter a comment.'
		});
		return;
	}
	if (data.content.length > 10000) {
		exports.sendResponse(request, response, {
			success: false,
			msg: 'Your comment is too long. Please keep it under 10000 characters. Thanks!'
		});
		return;
	}
	if (!_.isString(data.slug)) {
		exports.sendResponse(request, response, {
			success: false,
			msg: 'No post found you can comment on.'
		});
		return;
	}
	if (!_.isString(data.token)) {
		exports.sendResponse(request, response, {
			success: false,
			msg: 'You need to be logged in to comment.'
		});
		return;
	}
	submitobj.content = data.content;
	submitobj.date = Date.now();
	submitobj.post = data.slug;

	if (data.reply_to) {
		submitobj.reply_to = data.reply_to;
	}

	var afterUserFetched = function(user) {
		if (!user) {
			exports.sendResponse(request, response, {
				success: false,
				msg: 'You need to be logged in to comment.'
			});
			return;
		}
		submitobj.submitter = user.username;
		submitobj.score = 1;
		submitobj.upvoters = [submitobj.submitter];
		submitobj.downvoters = [];
		db.saveComment(submitobj, afterCommentSaved);
	}
	var afterCommentSaved = function(item) {
		item.rel_timestamp = moment(item.date).fromNow()
		item.html = markdown.convertToHTML(item.content);
		item.upvoted = true;
		item.vote = 1;
		item.deletable = true;
		var output = commenttemplates.comment(item);
		markdown.addInlinesToHTML(output, function (html) {
			exports.sendResponse(request, response, {
				success: true,
				html: html
			});
		});
		db.getPostBySlug(data.slug, function (post) {
			if (post) {
				post.comments++;
				db.savePost(post);
			}
		});
	}
	db.getUser(data.token, afterUserFetched)
}
exports.submitPost = function(request, response) {
	var data = request.body,
		submitobj = {},
		itunes_regex = new RegExp('^[0-9]+$');
	if (!data) return;
	if (!data.sub) {
		exports.sendResponse(request, response, {
			success: false,
			msg: 'Please select a one to submit to.',
		});
		return;
	}
	submitobj.sub = data.sub;
	var subs = workers.getSubs();
	var sub_exists = _.contains(_.pluck(subs, 'name'), data.sub);
	if (!sub_exists) {
		exports.sendResponse(request, response, {
			success: false,
			msg: 'The one you wanted to submit to does not exist.'
		});
		return;
	}
	if (!data.token) {
		exports.sendResponse(request, response, {
			success: false,
			msg: 'You are not logged in.'
		});
		return;
	}
	if (!data.entity) {
		exports.sendResponse(request, response, {
			success: false,
			msg: 'Please select if you want to submit a text post, a link or a playlist.'
		});
		return;
	}
	submitobj.entity = data.entity;
	var afterPlaylistFetched = function(playlist) {
		if (!playlist) {
			exports.sendResponse(request, response, {
				success: false,
				msg: 'Could not find this playlist.'
			});
			return;
		}
		playlist['public'] = true;
		db.savePlaylist(playlist);
		submitobj.playlist = playlist.url;
		submitobj.url = _.slugify(playlist.name).substr(0,75);
		submitobj.slug = playlist._id.toString();
		submitobj.title = playlist.name;
		db.getSongsByIdList(_.first(playlist.tracks, 4), afterPlaylistSongsFetched);
	}
	var afterPlaylistSongsFetched = function (songs) {
		submitobj.thumbnails = _.pluck(songs, 'image');
		db.getUser(data.token, afterUserFetched);
	}
	var afterSongFetched = function(song) {
		if (!song) {

			if (itunes_regex.test(data.id)) {
				itunes.lookup(data.id, {entity: 'song'}, afteriTunesQueryPerformed);
			}
			else {
				youtube.getById(data.id, function (error, success) {
					if (error) return;
					afterYouTubeQueryWasPerformed(success.items[0]);
				});
			}
			return;
		}
		submitobj.song = song.id;
		submitobj.url = _.slugify(song.name).substr(0,75);
		submitobj.slug = song.id;
		db.getUser(data.token, afterUserFetched);
	}
	var afteriTunesQueryPerformed = function(res) {
		if (!res) return;
		var results = res.results;
		if (results.length === 0) return
		else {
			var song = itunes.remap(results[0]);
			db.addTrack(song, function() {
				afterSongFetched(song);
			});
		}
	}
	var afterYouTubeQueryWasPerformed = function(youtube_video) {
		var song = itunes.remapYouTubeNew(youtube_video);
		db.addTrack(song, function() {
			afterSongFetched(song);
		})
	}
	var afterUserFetched = function(user) {
		if (!user) {
			exports.sendResponse(request, response, {
				success: false,
				msg: 'You are not logged in.'
			});
			return;
		}
		submitobj.user = user.username;
		submitobj.date = Date.now();
		submitobj.vote_count = 1;
		submitobj.upvoters = [submitobj.user];
		submitobj.downvoters = [];
		submitobj.comments = 0;
		db.getPost(submitobj.sub, submitobj.slug, function (item) {
			if (item) {
				exports.sendResponse(request, response, {
					success: false,
					msg: 'Sorry, this got submitted already recently. Please choose something different or submit somewhere else!'
				});
				return;
			}
			db.submitPost(submitobj, function(success) {
				if (!success) {
					exports.sendResponse(request, response, {
						success: false,
						msg: 'Sorry, something did not work. Please try again.'
					});
					return;
				}
				exports.sendResponse(request, response, {
					success: true,
					msg: 'Your post got submitted!',
					post: success[0]
				});
			});
		});
	}
	if (data.entity == 'song') {
		if (!data.id) {
			exports.sendResponse(request, response, {
				success: false,
				msg: 'No song specified.'
			});
			return;
		}
		db.findOneTrack(data.id, afterSongFetched);
	}
	if (data.entity == 'playlist') {
		if (!data.id) {
			exports.sendResponse(request, response, {
				success: false,
				msg: 'No playlist specified.'
			});
			return;
		}
		db.getPlaylist(data.id, afterPlaylistFetched);
	}
	if (data.entity == 'story') {
		if (!data.title || data.title == '') {
			exports.sendResponse(request, response, {
				success: false,
				msg: 'Please enter a title'
			});
			return;
		}
		if (data.title.length > 300) {
			exports.sendResponse(request, response, {
				success: false,
				msg: 'Please make your title shorter than 300 characters. Thanks!'
			});
			return;
		}
		if (!data.content || data.content == '') {
			exports.sendResponse(request, response, {
				success: false,
				msg: 'Please enter a post.'
			});
			return;
		}
		if (data.content.length > 10000) {
			exports.sendResponse(request, response, {
				success: false,
				msg: 'Please make your post shorter than 10000 characters. Thanks!'
			});
			return;
		}
		submitobj.title = data.title;
		submitobj.content = data.content;
		submitobj.slug = helpers.createID(4);
		submitobj.url = _.slugify(data.title).substr(0,75);
		db.getUser(data.token, afterUserFetched);
	}
}
exports.getSong 		= function (request, response) {
	var id 				= request.params.id + '',
		data  			= {},
		valid 			= new RegExp('^[a-zA-Z0-9_-]+$'),
		itunes_regex 	= new RegExp('^[0-9]+$'),
		render 			= function () {
			exports.sendResponse(request, response, data);
		},
		renderError 	= function (code) {
			exports.sendResponse(request, response, {
				success: false,
				error: code
			});
		},
		afterDBQueryPerformed = function (tracks) {
			if (tracks.length === 0) {
				if (itunes_regex.test(id)) {
					itunes.lookup(id, {entity: 'song'}, afteriTunesQueryPerformed);
				}
				else {
					youtube.getById(id, function (error, success) {
						console.log(error);
						if (error) { renderError(507); return;}
						afterYouTubeQueryWasPerformed(success.items[0]);
					});
				}
				data.wasindb = false;
			}
			else {
				afterTrackFound(tracks[0]);
				data.wasindb = true;
			}
		},
		afteriTunesQueryPerformed = function (res) {
			if (!res || !res.results || res.results.length == 0) {
				renderError(497);
				return;
			}
			afterTrackFound(itunes.remap(res.results[0]))
		},
		afterYouTubeQueryWasPerformed = function (res) {
			afterTrackFound(itunes.remapYouTubeNew(res));
		},
		afterTrackFound = function(song) {
			if (song.ytid) {
				afterHasYTID(song);
			}
			else {
				findYouTubeID(song)
			}
		},
		afterHasYTID = function(song) {
			data.song = song;
			data.success = true;
			render();
		},
		findYouTubeID = function(song) {
			youtube.search(song.artist + ' - ' + song.name, function (error, data) {
				if (data.items.length) {
					song.ytid = data.items[0].id.videoId;
					afterHasYTID(song);
				}
			});
		};
		if (valid.test(id)) {
			db.getSingleTrack(id, afterDBQueryPerformed);
		}
		else {
			renderError(501);
		}
}
exports.findYouTubeId = function(request, response) {
	var songid = parseFloat(request.query.id);
	if (_.isNaN(songid)) {
		exports.sendResponse(request, response, {
			success: false,
			msg: 'Invalid song id.'
		});
		return;
	}
	external.getTracksFromAllSources([songid], function (songs) {
		if (songs && songs.length > 0) {
			var song = songs[0];
			youtube.search(song.artist + ' - ' + song.name, function (err, data) {
				if (data.items.length) {
					song.ytid = data.items[0].id.videoId;
				}
				exports.sendResponse(request, response, {
					success: true,
					youtube_id: song.ytid
				});
				db.updateTrack(song);
			});
		}
		else {
			exports.sendResponse(request, response, {
				success: false,
				msg: 'Song not found in database.'
			});
			return;
		}
	});
}
exports.getHomepage = function(request, response) {
	var data = {
		charts: charts.getAllCache(),
		reddit: _.chain(workers.returnRedditSongs('Music')).shuffle().value()
	}
	var yearrange = workers.getYearRange();
	var randomyear = _.sample(yearrange);
	var getRetroCharts = function (callback) {
		db.getRetroCharts(randomyear, function (retro) {
			if (retro) {
				db.getSongsByIdList(retro.charts, function (topanno) {
					if (topanno) {
						data.retro = {
							charts: topanno,
							year: randomyear
						}
						callback();
					}
				});
			}
			else {
				callback()
			}
		});
	}
	getRetroCharts(function () {
		exports.sendResponse(request, response, data);
	});
}
exports.getArtist = function(request, response) {
	var id = request.params.id,
		data = {
		},
		evaluateiTunesQuery = function(res, body) {
			if (!res || res.results.length == 0) {
				exports.sendResponse(request, response, {
					success: false,
					msg: 'Could not get artist from iTunes'
				});
				return;
			}
			var first_result = res.results[0];
			data.artist = {
				name: first_result.artistName,
				id: first_result.artistId,
				genre: first_result.primaryGenreName
			}
			getAllArtistTracks(id);
		},
		getAllArtistTracks = function(id) {
			itunes.lookup(id, {entity: 'song', limit: 1000}, afterAllArtistTracks);
		},
		afterAllArtistTracks = function(res) {
			if (!res) {
				exports.sendResponse(request, response, {
					success: false,
					msg: 'Could not get tracks from iTunes'
				});
				return;
			}
			var songs = res.results,
				artist = songs.splice(0,1),
				tracks = _.map(songs, function (song) { return itunes.remap(song); });
			afterSongListIsReceived(tracks);
			db.addArtist(artist);
			db.addTracksBulk(tracks);
		},
		afterSongListIsReceived = function(songs) {
			var albums = {};
			_.each(songs, function (song) {
				if (song) {
					if (!albums[song.albumid]) {
						albums[song.albumid] = [];
					}
					albums[song.albumid].push(song);
				}
			});
			var top10 = _.chain(songs).uniq(function (song) { return song.name }).first(10).value();
			data.top10 = top10;
			var collections = [];
			_.each(albums, function (songs, name) {
				var albumarray = _.chain(songs)
				.uniq(function (song) { return song.id })
				.sortBy(function (song) { return song.numberinalbum })
				.value()

				var cds = _.chain(albumarray)
				.groupBy(function (song) { return song.cdinalbum })
				.values()
				.value()

				var albuminfo = helpers.albumRelevance({
					cds: cds,
					id: albumarray[0].albumid,
					tracks: albumarray.length,
					artist: albumarray[0].artist,
					release: albumarray[0].release,
					image: albumarray[0].image,
					name: albumarray[0].album,
					hours: _.chain(albumarray).pluck('duration').reduce(function (memo, num) { return memo + parseFloat(num) }, 0).value(),
					released: (new Date(albumarray[0].release) - new Date()) < 0
				}, _);
				collections.push(albuminfo);
			});
			collections = _.chain(collections)
			.sortBy(function (album) { return album.release })
			.map(function (album) { return helpers.parseAlbumTitle(album); })
			.uniq(function (album) { return album.name })
			.value()
			.reverse();

			if (collections.length != 0) {
				data.headerimage_mobile = helpers.getHQAlbumImage({image: collections[0].image}, 400)
				data.headerimage_desktop = helpers.getHQAlbumImage({image: collections[0].image}, 1200)
			}

			data.albums = collections;
			render();
		},
		afterArtistIsAvailable = function() {
			db.getSongsByArtistId(data.artist.id, afterSongListIsReceived);
		},
		iTunesQuery = function() {
			itunes.lookup(id, {entity: 'musicArtist'}, evaluateiTunesQuery);
		},
		afterArtistFetch = function(artists) {
			if (artists.length === 0) {
				iTunesQuery(id);
			}
			else {
				data.artist = artists[0];
				afterArtistIsAvailable();
			}
		},
		render = function() {
			data.success = true;
			exports.sendResponse(request, response, data);
		}
		db.getArtist(id, afterArtistFetch);
}
exports.getAlbum = function(request, response) {
	var onlynumbers = new RegExp('^[0-9]+$'),
		id = parseInt(request.params.id),
		data = {}
	if (!onlynumbers.test(id +"")) {
		exports.sendResponse(request, response, {
			success: false,
			msg: 'Album ID can only contain numbers.'
		});
		return;
	}
	var afteriTunesRequestMade = function(itunesresponse, body) {
		if (!itunesresponse || itunesresponse.results.length == 0) {
			exports.sendResponse(request, response, {
				success: false,
				msg: 'Could not get album from iTunes'
			});
			return;
		}
		var info = itunesresponse.results;
		data.album = info.splice(0,1)[0];
		data.songs = _.map(info, function (song) { return itunes.remap(song); });
		data.album = helpers.makeAlbum(data, _);
		remapAlbums();
	}
	var afterAlbumTracksFetched = function (songs) {
		data.songs = songs;
		data.songs = _.uniq(data.songs, function (song) { return song.id + '' });
		if ((new Date(data.album.release) - new Date()) < 0) {
			db.addAlbum(data.album);
			db.addTracksBulk(data.songs);
		}
		remapAlbums();
	}
	var remapAlbums = function() {
		data.album.released = (new Date(data.album.release) - new Date()) < 0;
		var sorted = _.sortBy(data.songs, function (song) { return song.numberinalbum });
		var grouped = _.groupBy(sorted, 'cdinalbum');
		data.album.cds = _.values(grouped);
		data.hqimage = helpers.getHQAlbumImage(data.album, 400);
		data.success = true;
		delete data.songs;
		exports.sendResponse(request, response, data);
	}
	var afterDBQueryPerformed = function(album) {
		album = (album.length == 0) ? null : album[0];
		if (album) {
			data.album = album;
			db.getTracksFromAlbum(id, afterAlbumTracksFetched);
		}
		else {
			itunes.lookup(id, {entity: 'song'}, afteriTunesRequestMade);
		}
	}
	db.getSingleAlbum(id, afterDBQueryPerformed);
}
