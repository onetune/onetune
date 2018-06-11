var jsonreq = require('jsonreq'),
	request = require('request');

exports.search = function (song, callback) {
	var query = song.name;
	if (song.provider != 'youtube') {
		query += ' ' + song.artist;
	}
	jsonreq.get('https://api.genius.com/search?q=' + query, function (err, json) {
		if (err || !json || !json.response || !json.response.hits || json.response.hits == 0) {
			return callback(null);
		}
		callback(json.response.hits[0].result.id);
	});
}

exports.getJS = function(song, callback) {
	exports.search(song, function(genius_id) {
		if (genius_id) {
			request.get('https://genius.com/songs/' + genius_id + '/embed.js', function (err, response, js) {
				if (err) {
					callback(null);
				}
				else {
					js = js.replace(/\\r/g, "");
					js = js.replace(/document\.write/g, "genius_receiver");
					js = js.replace(/\<\/script\>/g, "<' + '/script>");
					callback(js, genius_id);
				}
			});
		}
		else {
			callback(null);
		}
	})
}
