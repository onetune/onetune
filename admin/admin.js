var swig 	= require('swig'),
	dirup 	= __dirname.substr(0, __dirname.length - 6),
	cookies = require('cookies'),
	db 		= require('../db/queries'),
	reddit 	= require('../config/reddit'),
	_ 		= require('underscore'),
	yturl 	= require('get-youtube-id'),
	admin 	= this,
	standard= require('../config/standards'),
	async 	= require('async');

this.home = function (request, response) {
	var tmpl = swig.compileFile(dirup + '/admin/templates/main.html');
	var output = tmpl();
	var data = {};
	var afterVerification = function() {
		db.getSongCount(afterSongCount);
	}
	var afterSongCount = function(count) {
		data.songCount = count;
		db.getUserCount(afterUserList);
	}
	var afterUserList = function(count) {
		// Minus 1 because we have 1 test account
		data.userCount = count - 1;
		db.getWatchIds(afterWatchIds);
	}
	var afterWatchIds = function(item) {
		data.watchIds = item.values;
		render();
	}
	var render = function() {
		response.end(tmpl(data));
	}
	admin.auth(request, response, afterVerification, admin.notAuthenticated);
}

this.auth = function(request, response, callback, failCallback) {
	var cookie = new cookies(request, response),
		token = cookie.get('token');
	if (token) {
		db.getUser(token, function (user) {
			if (!user) { failCallback(response); return; };
			if (_.contains((process.env.ALLOWED_USERS || '').split(','), user.username)) {
				callback(user)
			}
			else {
				failCallback(response);
			}
		});
	}
	else {
		failCallback(response);
	}
}

this.notAuthenticated = function(response) {
	response.redirect('/')
}
this.redditadd 		= function(request, response) {
	var afterVerification = function() {
		var id = request.query.id
		if (id) {
			db.addWatchId(id, function() {
				response.redirect('/admin/')
			});
			reddit.observeThread(id);
		}
	}
	admin.auth(request, response, afterVerification, admin.notAuthenticated);
}
this.redditremove	= function(request, response) {
	var afterVerification = function() {
		var id = request.params.id;
		if (id) {
			db.removeWatchId(id, function() {
				response.redirect('/admin/')
			});
		}
	}
	admin.auth(request, response, afterVerification, admin.notAuthenticated);
}
this.reported = function(request, response) {
	var afterVerification = function() {
		db.getReports(function(data) {
			var data = _.map(data, function (report) {
				report.keys = _.keys(report.fields_to_change);
				report.values = _.values(report.fields_to_change);
				return report;
			});
			var tmpl = swig.compileFile(dirup + '/admin/templates/reported.html');
			response.end(tmpl({data: data}));
		});
	}
	admin.auth(request, response, afterVerification, admin.notAuthenticated);
}
this.acceptReportRequest = function(request, response) {
	acceptReport(request.params.id, function () {
		db.removeReport(request.params.id, function (success) {
			response.redirect('/admin/reported');
		});
	});
}
this.acceptReport = acceptReport = function(id, callback) {
	db.getSingleReport(id, function (report) {
		db.getSingleTrack(report.track.id + '', function (song_in_db) {
			_.each(report.fields_to_change, function (value, key) {
				song_in_db[0][key] = value;
			});
			db.updateTrack(song_in_db[0], function() {
				var sync_object = {
					time: Date.now(),
					track_id: song_in_db[0].id + '',
					fields_changed: report.fields_to_change
				}
				db.saveRecentUpdate(sync_object, function (success) {
					if (success && callback) {
						callback()
					}
				});
			});
		});
	});
}
this.rejectReport = function(request, response) {
	db.removeReport(request.params.id, function (success) {
		response.redirect('/admin/reported');
	})
}
this.showSubs = function(request, response) {
	var afterVerification = function() {
		db.getSubs(function (subs) {
			var tmpl = swig.compileFile(dirup + '/admin/templates/subs.html');
			var output = tmpl({subs: subs});
			response.end(output);
		});
	}
	admin.auth(request, response, afterVerification, admin.notAuthenticated);
}
this.insertStandardSubs = function(request, response) {
	var afterVerification = function() {
		async.each(standard.subs, function (sub, cb) {
			db.insertSub(sub, cb);
		}, function () {
			response.redirect('/admin/subs');
		});
	}
	admin.auth(request, response, afterVerification, admin.notAuthenticated);
}
this.addModerator = function(request, response) {
	if (!request.params.sub || !request.query.moderator) return;
	var afterVerification = function() {
		db.addModerator(request.params.sub, request.query.moderator, function() {
			response.redirect('/admin/subs');
		});
	}
	admin.auth(request, response, afterVerification, admin.notAuthenticated);
}
this.getStats = function(request, response) {
	db.getFancyStats(function (stats) {
		response.end(JSON.stringify(stats));
	});
}
this.getPlaylists = function(request, response) {
	db.getPlaylistCategories(function (items) {
		items = _.reject(items, function (item, key) {
			if (item.child_of) {
				items = _.map(items, function (i) {
					if (i.id == item.child_of) {
						if (!i.children) {
							i.children = [];
						}
						i.children.push(item);
					}
					return i;
				});
				return true
			}
		});
		var tmpl = swig.compileFile(dirup + '/admin/templates/categories.html');
		var output = tmpl({categories: items});
		response.end(output);
	});
}
this.createPlaylist = function(request, response) {
	var fields = request.body;
	if (!fields.name) {
		return response.end('Name is obligatory.');
	}
	if (!fields.id) {
		return response.end('Identifier is obligatory.');
	}
	if (!fields.image) {
		return response.end('Image is obligatory.');
	}
	var allowed_fields = _.pick(fields, 'name', 'id', 'image', 'child_of');
	db.insertPlaylistCategory(allowed_fields, function () {
		response.redirect('/admin/playlists');
	});
}
