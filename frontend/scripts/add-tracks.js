addtracks = {
	calls: [],
	lastrequest: null,
	autocomplete: function(query) {
		search.calls = [];
		var types = {
			track: {
				iTunesName: 'song',
				title: 		'trackName',
				sub: 		'artistName',
				element: 	$('.add-tracks-results'),
				id: 		'trackId'
			}
		}
		this.lastrequest = query;
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
							if (query != addtracks.lastrequest) return;
							if ($('.add-tracks-input').val() == '') return;
							info.element.show().empty();
							$.each(json.results, function(key, result) {
								var div = $('<div>', { class: 'search-result' });
										  $('<div>', { class: 'search-result-title' }).text(result[info.title]).appendTo(div);
										  $('<div>', { class: 'search-result-sub' }).text(result[info.sub]).appendTo(div);
								var song = helpers.remap(result);
								var a   = $('<span>'  , { 'data-id' : song.id, 'data-name': song.name, 'data-artist': song.artist, 'data-image': song.image}).html(div).on('click', function() {
									info.element.hide();
									var route = $('#view').attr('data-route');
									if (route == '/library') {
										library.add({id: result.trackId});
									}
									else if (route.substr(0, 3) == '/u/'){
										playlist.add({id: result.trackId}, route);
									}
									else if (route.match('/submit')) {
										submit.selectSong(song);
									}
									$(".add-tracks-input").val("").focus();
									info.element.html('');
									window.lastsearchtimestamp = null;
								});
								a.appendTo(info.element);
								if (key == 0) {
									$(a).addClass('add-tracks-selected');
								}
							})
						}
					}
				)
				search.calls.push(ajax);
			}
		)
	}
}
