var clientID       = process.env.FACEBOOK_CLIENT_ID;
var clientSecret   = process.env.FACEBOOK_CLIENT_SECRET;
//var redirect_uri   = (process.env.HOME == '/Users/jonny' || process.env.HOME == '/Users/jonnyburger' || process.env.HOMEPATH == '\\Users\\JACK') ? 'http://localhost:5000/auth/facebook/token' : 'https://onetune.fm/auth/facebook/token';
var redirect_uri   = 'https://onetune.fm/auth/facebook/token';
var Cookies		   = require('cookies');
var fbapi		   = require('facebook-api');
var slugify		   = require('slugify');
var helpers 	   = require('../frontend/scripts/helpers').helpers;
var db			   = require('../db/queries');
var _			   = require('underscore');
var standards	   = require('../config/standards');
var sanitizer 	   = require('sanitizer');
var ajax	 	   = require('request');
var password_hash  = require('password-hash');

this.login 				= function(request, response) {
	if (request.query.mobile) {
		redirect_uri = encodeURI(redirect_uri + '?mobile=true')
	}
    response.redirect('https://www.facebook.com/v2.6/dialog/oauth?response_type=code&client_id=' + clientID + '&redirect_uri=' + redirect_uri + '&state=state');
}
this.token 				= function(request, response) {
	exchange(request.query.code, request, response, request.query.mobile);
}
this.access 			= function(request, response) {
	getUserInfo(request.query.code, request, response, request.query.mobile);
}
this.logout				= function(request, response) {
	var cookie = new Cookies(request, response);
	cookie.set('token', '', {httpOnly: false});
	response.redirect('/');
}
var checkLoginState = this.checkLoginState	= function(request, callback) {
	var cookie = new Cookies(request),
		token  = cookie.get('token');
		/*
			Fallback to a URL parameter
			This is needed for the iOS app that has no cookies
		*/
		if (!token) {
			token = request.query.token;
			if (!token) {
				callback(null);
				return;
			}
		}
		if (token) {
			db.getUser(token, function(user) {
				callback(user)
			})
		}
		else {
			callback(null);
		}
}
this.getLibraryFromRequest = function(request, callback) {
	checkLoginState(request, function(user) {
		if (user) {
			db.getUserCollections(user, function(collections) {
				callback({collections: collections});
			})
		}
		else {
			callback(null);
		}
	})
}
this.addTrack			= function(song, user, callback) {
	db.getUserCollections(user, function(collections) {
		collections.library.push(song.id + '');
		collections.library = _.uniq(collections.library);
		db.saveUserCollections(collections, function(collection) {
			callback(collection);
		});
	});

}
this.addPlaylist 		= function(name, user, callback) {
	db.getUserCollections(user, function(collections) {
		if (name == '') {
			callback({fail: 'You must enter a name.'});
			return;
		}
		else {
			var plname 		 = sanitizer.escape(name),
				url 		 = '/u/' +user.username + '/p/' + _.slugify(name),
				exists 		 = _.contains(_.pluck(collections.playlists, 'url'), url);
			if (!exists) {
				var playlist = {
					name: plname,
					url:  url
				}
				collections.playlists.unshift(playlist);
				var dbpl = {
					'owner': user.id,
					'tracks': [],
					'public': true,
					'url': playlist.url,
					'name': playlist.name,
					'newestattop': false
				}
				db.createPlaylist(dbpl, function() {
					db.saveUserCollections(collections, function(collection) {
						callback({fail: false}, dbpl);
					});
				});

			}
			else {
				callback({fail: 'A playlist with the same name already exists.'});
			}
		}

	});
}
this.renamePlaylist 	= function(oldname, newname, user, callback) {
	db.getUserCollections(user, function(collections) {
		if (newname == '') {
			callback({fail: 'You must enter a name.'});
			return;
		}
		else {
			var plname 	= sanitizer.escape(newname),
				url 	= '/u/' +user.username + '/p/' + _.slugify(plname),
				exists 	= _.contains(_.pluck(collections.playlists, 'url'), url);
			if (!exists) {
				collections.playlists = _.map(collections.playlists, function(playlist) { if (playlist.url == oldname) { playlist.name = newname; playlist.url = url;} return playlist});
				db.updatePlaylist(oldname, newname, url, function(item) {
					db.saveUserCollections(collections, function(collection) {
						callback({fail: false}, {url: url, name: plname});
					})
				});
			}
			else {
				callback({fail: 'A playlist with the same name already exists.'})
			}
		}
	})
}
this.deletePlaylist 	= function(url, user, callback) {
	db.getUserCollections(user, function(collections) {
		var before = collections.playlists.length;
		collections.playlists = _.filter(collections.playlists, function(playlist) { return  playlist.url != url});
		var after  = collections.playlists.length;
		if (before > after) {
			db.saveUserCollections(collections, function() {
				db.removePlaylist(url, function(state) {
					callback(state);
				});
			});
		}

	});
}
this.addTracks 			= function(songs, user, callback) {
	db.getUserCollections(user, function(collections) {
		_.each(songs, function(song) {
			collections.library.push(song.id + '');
			collections.library = _.uniq(collections.library);
		});
		db.saveUserCollections(collections, function(collection) {
			callback(collection);
		})
	})
}
this.removeTrack		= function(song, user, callback) {
	db.getUserCollections(user, function(collections) {
		collections.library = _.without(collections.library, song.id + '');
		db.saveUserCollections(collections, function(collection) {
			callback(collection);
		})
	})
}
var exchange 			= function(code, request, response, mobile) {
	ajax(
		'https://graph.facebook.com/v2.6/oauth/access_token?client_id=' + clientID + '&redirect_uri=' + redirect_uri + '&client_secret=' + clientSecret + '&code=' + code,
		function(error, r, c) {
			if (error) {
				response.end("Facebook error");
			}
			else {
				var json			= JSON.parse(c);
				var access_token	= json.access_token;
				getUserInfo(access_token, request, response, mobile);
			}
		}
	);
}
var getUserInfo	 		= function(access_token, request, response, mobile) {
	db.getFacebookUser(access_token, function (user) {
		if (user) {
			afterAuth(user);
		}
		else {
			var client = fbapi.user(access_token);
			client.me.info(function (err, json) {
				console.log(json)
				if (err) {
					response.json({
						success: false,
						socket: 'login-failed',
						socket_body: {
							reason: 'You already used this Facebook auth code.',
						}
					});
					return;
				}
				afterAuth(json);
				db.insertFacebookUser(access_token, json);
			});
		}
	});
	var afterAuth = function(json) {
		var token = helpers.createID(64);
		var user  = {
			id: 			json.id,
			first: 			json.first_name,
			last: 			json.last_name,
			token:  		token,
			// TODO: Possible to create a username collusion
			// This is because Facebook's API does not anymore return a distinct username
			username: 		slugify(json.name).toLowerCase().replace(/\-/, ''),
			settings: 		standards.settings
		}
		var setCookie = function(callback) {
			var cookie = new Cookies(request, response);
			cookie.set('token', token, {expires: new Date(2030, 10, 1, 1, 1, 1, 1), httpOnly: false});
			callback(user);
		}
		var redirectToHome = function(user) {
			if (mobile) {
				response.json({
					success: true,
					socket: 'login-successful',
					socket_body: {
						token: token,
						username: user.username
					}
				});
				return;
			}
			response.redirect('/');
		}
		db.checkIfUserExists(user, function (user_exists) {
			if (user_exists) {
				db.updateUser(user, function() {
					setCookie(redirectToHome);
				});
			}
			else {
				db.checkIfUsernameIsTaken(user.username, function (is_taken) {
					if (is_taken) {
						if (mobile) {
							response.json({
								success: false,
								socket: 'login-failed',
								socket_body: {
									reason: 'Your Facebook username is already taken. Please go to the onetune.fm homepage to register.'
								}
							});
							return;
						}
						db.addUserProvisionally(user, function (item) {
							response.redirect('/select_username/' + item._id);
						});
					}
					else {
						db.addUser(user, function() {
							setCookie(function () {
								return redirectToHome(user);
							});
						});
					}
				});
			}
		});
	}
}
this.createAccountFromUserData = function(data, callback) {
	var token = helpers.createID(64);
	var user = {
		id: data.username,
		token: token,
		username: data.username,
		settings: standards.settings,
		password: password_hash.generate(data.password)
	}
	db.addUser(user, function() {
		callback(user);
	});
}
this.inlib				= function(song, token, callback) {
	db.getUser(token, function(user) {
		if (user) {
			db.getUserCollections(user, function(collections) {
				var library = collections.library,
					stars 	= collections.starred,
					inlib 	= _.contains(library, 	song.id + ''),
					starred = _.contains(stars, 	song.id + '');
				callback({
					inlib: inlib,
					starred: starred
				});
			});
		}
	});
}
this.ownspl 			= function(playlist, token, callback) {
	if (!token) {
		callback(false); return;
	}
	db.getUser(token, function(user) {
		if (user) {
			db.getUserCollections(user, function(collections) {
				var playlists 	= collections.playlists,
					ownspls 	= _.pluck(playlists, 'url'),
					ownspl 		= _.contains(ownspls, playlist);
					callback(ownspl)
			});
		}
	});
}
this.getUserPlaylists 	= function(token, callback) {
	db.getUser(token, function(user) {
		if (user) {
			db.getPlaylistsFromUserId(user.id, function(playlists) {
				callback(playlists);
			});
		}
	});
}
