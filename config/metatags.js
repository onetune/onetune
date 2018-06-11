var metatags 	= this,
	db 			= require('../db/queries'),
	_ 			= require('underscore');

this.get = function (request, callback) {
	switch (request.route.path) {
		case '/song/:id':
			metatags.song(request.params, callback);
			break;
		default:
			metatags.default_tags(callback);
	}
}

this.default_tags = function(callback) {
	var output = _.template(
	[
		"<meta property='og:image' content='https://onetune.fm/api/i/logo'>",
		"<meta property='og:title' content='OneTune - Free music streaming'>",
		"<meta property='og:url' content='https://onetune.fm'>",
		"<meta property='og:site_name' content='OneTune'>",
		"<meta property='og:description' content='The free, open music platform'>",
	].join('\n'), {});
	callback(output)
}

this.song = function(params, callback) {
	db.getSingleTrack(params.id + '', function (song) {
		if (song.length == 0) {
			callback('')
		}
		else {
			var output = _.template(
				[
					"<meta property='og:image' content='<%- image %>'>",
					"<meta property='og:title' content='<%- name %> - <%- artist %>'>",
					"<meta property='og:url' content='https://onetune.fm/song/<%- id %>'>",
					"<meta property='og:type' content='music.song'>",
					"<meta property='og:site_name' content='OneTune'>",
					"<meta property='og:description' content='Listen for free on OneTune'>",
				].join('\n'),
				song[0]
			);
			callback(output);
		}
	});
}
