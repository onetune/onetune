var json = require('jsonreq');

exports.search = function(obj) {
	var string = obj.domain + 'search.do?apikey=' + obj.api_key + '&reqtype=default&searchtype=track&track=' + escape(obj.track) + '&artist=' + escape(obj.artist) + '&output=json'
	json.get(string, function(err, result) {
		if (!err) {
			obj.callback(result);
		}
	});
}
exports.display = function(obj) {
	var string = obj.domain + 'lyric.do?apikey=' + obj.api_key + '&reqtype=default&trackid=amg:' + obj.id + '&output=json&useragent=' + obj.useragent;
	json.get(string, function(err, result) {
		if (!err) {
			obj.callback(result);
		}
	});
}