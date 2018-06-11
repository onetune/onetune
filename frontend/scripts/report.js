report = {
	showList: function (track) {
		recognition.findVideo(track, function(videos) {
		    _.each(videos, function (video) {
		    	var ytid = video.advanced.id
		    	var container = $('<div class="report-page-video" data-reportytid="'+ytid+'">');
		    	$('<img>').attr('src', video.basic.snippet.thumbnails.default.url).appendTo(container);
		    	var title = video.basic.snippet.title
		    	if (title.length > 80) { title = title.substr(0,80) + '...' }
		    	$('<h3>').text(title).appendTo(container);
		    	var p = $('<p>').text(video.basic.snippet.channelTitle).appendTo(container);
		    	if (ytid == track.ytid) {
		    		$('<span>').text('current video').appendTo(p);
		    	}
		    	$('<span>').text(Math.floor((video.points/900)*10000)/100 + '%').appendTo(p)
		    	container.appendTo('.report-video-list');
		    });
		}, null, null, null, {all_videos: true})
	}
}