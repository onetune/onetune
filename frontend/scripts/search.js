search = {
	calls: [],
	autocomplete: function(query) {
		var wrapper = $('#search-results-wrapper');
		search.calls = [];
		var types = {
			artist: {
				iTunesName: 'musicArtist',
				title: 		'artistName',
				sub: 		'primaryGenreName',
				element: 	$('#results-artists'),
				link: 		'/artist/$1',
				id: 		'artistId',
				image: 		'svg-artist-black'
			},
			album: {
				iTunesName: 'album',
				title: 		'collectionName',
				sub: 		'artistName',
				element: 	$('#results-albums'),
				link: 		'/album/$1',
				id: 		'collectionId',
				image: 		'svg-album-black'
			},
			track: {
				iTunesName: 'song',
				title: 		'trackName',
				sub: 		'artistName',
				element: 	$('#results-tracks'),
				link: 		'/song/$1',
				id: 		'trackId',
				image: 		'svg-music-black'
			}
		}
		var results = {
			count: 0,
			album: [],
			track: [],
			artist: [],
			youtube: []
		};
		var startLoadingIndicator 	= function() {
			$('#search-spinner').show()
		}
		var endLoadingIndicator 	= function() {
			$('#search-spinner').hide();
		}
		if (query == '') {
			endLoadingIndicator();
			return;
		}
		var allResultsFetched = function(results) {
			var lv_track = results.track.length > 0 ? _s.levenshtein(results.track[0].title.toLowerCase(), query.toLowerCase()) : 1000;
			var lv_artist = results.artist.length > 0 ? _s.levenshtein(results.artist[0].title.toLowerCase(), query.toLowerCase()) : 1000;
			var lv_album = results.album.length > 0 ? _s.levenshtein(results.album[0].title.toLowerCase(), query.toLowerCase()) : 1000;
			var top;
			if (Math.min(lv_track, lv_album, lv_artist) == lv_track) {
				top = results.track.splice(0,1);
			}
			else if (Math.min(lv_track, lv_album, lv_artist) == lv_album) {
				top = results.album.splice(0,1);
			}
			else if (Math.min(lv_track, lv_album, lv_artist) == lv_artist) {
				top = results.artist.splice(0,1);
			}
			wrapper.empty();
			$('.search-placeholder').hide();
			var insert = function (result, key) {
				var html 		= $('<li class="search-result" data-navigate="' + result.link + '"><img src="/api/i/pixel" class="' + result.image + '"><p>' + result.title + '</p><p class="search-result-sub">' + result.sub + '</p></li>');
				endLoadingIndicator();
				wrapper.append(html);
			}
			var insertTitle = function(text) {
				wrapper.append('<h2>' + text + '</h2>');
			}
			if (top.length > 0) {
				insertTitle('Top result');
				insert(top[0], 0, true)
			}
			if (results.track.length > 0) { insertTitle('Songs'); }
			_.each(results.track, insert);
			if (results.artist.length > 0) { insertTitle('Artists'); }
			_.each(results.artist, insert);
			if (results.album.length > 0) { insertTitle('Albums'); }
			_.each(results.album, insert);
			if (results.youtube.length > 0) { insertTitle('Youtube results'); }
			_.each(results.youtube, insert);
			$('#search-results').addClass('search-results-visible');
			$('.search-result').eq(0).addClass('search-selected')
		}
		startLoadingIndicator();
		$.each(types, function(type, info)
			{
				var ajax = $.ajax(
					{
						url: 'https://itunes.apple.com/search',
						data: {
							term: query,
							entity: info.iTunesName,
							limit: 3
						},
						dataType: 'jsonp',
						success: function(json) {
							_.each(json.results, function(result) {
								results[type].push({
									title: 		result[info.title],
									sub: 		result[info.sub],
									type: 		type,
									link: 		info.link.replace('$1', result[info.id]),
									image: 		info.image
								});
							});
							results.count++;
							if (results.count == 4) {
								allResultsFetched(results)
							}
						}
					}
				)
				search.calls.push(ajax);

			}
		);
		var yt_ajax = $.ajax(
			{
				url: 'https://www.googleapis.com/youtube/v3/search',
				data: {part: 'snippet', 'maxResults': 5, q: query, key: "AIzaSyCCRAemuZXM6GwYQWXOQI1e4kMnB57LtX0"},
				success: function (json) {
					console.log(json)
					_.each(json.items, function (youtube_result) {
						results.youtube.push({
							title: youtube_result.snippet.title,
							sub: youtube_result.snippet.channelTitle,
							type: 'youtube',
							link: '/song/' + youtube_result.id.videoId,
							image: 'svg-music-black'
						});
					});
					results.count++;
					if (results.count == 4) {
						allResultsFetched(results);
					}
				}
			}
		)
	}
}
