colors = {
	getForUrl: function (url, callback) {
		ImageAnalyzer(url, function (bgColor, primaryColors, secondaryColor, detailColor) {
			var brightness = _.reduce(secondaryColor.split(','), function (a, b) { return a + parseInt(b) }, 0);
			var dark = brightness > 383;
			callback(bgColor, primaryColors, secondaryColor, detailColor, dark);
		});
	},
	getMostCommon: function(playlist) {
		var mostCommon = _.max(_.groupBy($('#view').find('.song'), function(song) { return $(song).attr('data-artist') }), function(a) { return a.length })
		if (!mostCommon || mostCommon.length == 0) {
			return;
		}
		var image = $(mostCommon[0]).attr('data-image');
		var artist = $(mostCommon[0]).attr('data-artist');
		colors.getForUrl(colors.createProxyUrl(helpers.getHQAlbumImage({image: image}, 400)), function (bg, primary, secondary, detail, black) {
			colors.save(bg, primary, secondary, detail, black, image, artist, playlist);
			colors.setColors(bg, primary, secondary, detail, black);
		});
		$('.feature-placeholder').text(artist);
	},
	save: function(bgColor, primaryColor, secondaryColor, detailColor, dark, url, artist, playlist) {
		var data = {
			bgColor: bgColor,
			primaryColor: primaryColor,
			secondaryColor: secondaryColor,
			detailColor: detailColor,
			dark: dark,
			url: url,
			artist: artist,
			playlist: playlist
		}
		$.ajax({
			url: '/api/playlists/style',
			data: data,
			type: 'POST',
			dataType: 'json'
		});

		oneTune.playlists(_.map(oneTune.playlists(), function (pl) {
			if (pl.url == playlist) {
				pl.style = data;
			}
			return pl;
		}));
	},
	createProxyUrl: function(url) {
		return '/api/cover?url=' + url;
	},
	setColors: function (bg, primary, secondary, detail, black) {
		$('.playlist-header-v3').css('background', 'rgb(' + bg + ')');
		$('.playlist-header-v3 h1').css('color', 'rgb(' + primary + ')');
		$('.playlist-header-v3 h2').css('color', 'rgb(' + secondary + ')');
		$('.playlist-header-v3 .feature-placeholder').css('color', 'rgb(' + secondary + ')');
		$('.playlist-header-v3 .pl-v3-details p').css('color', 'rgb(' + detail + ')')
		$('.playlist-header-v3 .v3-icon-bg').css('background', 'rgb(' + secondary + ')')
		$('.playlist-header-v3 .v3-icon-big.v3-color-matching')[black ? 'removeClass' : 'addClass']('white');
	}
}