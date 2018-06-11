youtube = {
	getVideo: function(json, song, callback, _, _s) {
		var videos = json.feed.entry
		callback(videos)
	}
}