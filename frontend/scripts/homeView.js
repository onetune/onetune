ko.bindingHandlers.song = {
	update: function (element, valueAccessor, allBindings) {
        var value = ko.utils.unwrapObservable(valueAccessor()) || {};
        _.each(valueAccessor(), function (data, key) {
        	$(element).attr('data-' + key, data);
        });
    }
}

ko.components.register('v2-song-box', {
	viewModel: function(params) {
		this.song = params.song

		this.isInLibrary = (function(id) {
			return _.contains(oneTune.library(), id) ? 'in-library' : 'not-in-library';
		}).bind(this);

		this.isNowPlaying = (function(id) {
			return oneTune.nowPlaying() && oneTune.nowPlaying().id == id
		}).bind(this);

		this.isHearable = (function(id) {
			return this.isNowPlaying(id) && oneTune.hearable();
		}).bind(this);

		this.handleClick = function(component, event) {
			if (this.isNowPlaying(component.song.id)) {
				if (this.isHearable(component.song.id)) {
					player.pause();
				}
				else {
					player.play();
				}
			}
			else {
				playbutton($(event.target).parents('.song')[0]);
			}
		}
		this.song.formattedTitle = helpers.parsetextstrict(this.song.name);
		this.formatImage = function (img) {
			return helpers.getHQAlbumImage({image: img}, 200);
		}
	},
	template: $('#template-v2-song-box').html()
})
ko.applyBindings();

function HomeView() {
	this.playlists = oneTune.playlists;
	this.library = oneTune.songs;
	this.charts = oneTune.charts;
	this.reddit = oneTune.reddit;
	this.retro = oneTune.retro;

	this.isRetro = (function() {
		return oneTune.retro();
	}).bind(this);

	this.isLoggedIn = oneTune.isLoggedIn;

	this.refreshRetro = function() {
		$.ajax({
			url: '/api/charts/retro/random',
			dataType: 'json',
			success: function(json) {
				oneTune.retro({year: json.year, charts: json.tracks})
			}
		})
	}

	$.ajax({
		url: '/api/homepage',
		dataType: 'json',
		success: function(json) {
			oneTune.charts(json.charts);
			oneTune.reddit(json.reddit);
			oneTune.retro(json.retro);
		}
	})

	this.refreshRetro();
}

function SongPage(id) {
	this.songid = id;
	var song = ko.observable()
	this.song = song;
	this.playlists = oneTune.playlists;
	this.headerimage = (function() {
		return helpers.getHQAlbumImage(this.song(), 1200);
	});

	this.isYouTubeClass = (function() {
		return (this.song() && this.song().provider && this.song().provider == 'youtube') ? 'youtube-page' : '';
	}).bind(this);

	this.isInLibrary = (function() {
		return _.contains(oneTune.library(), this.songid);
	});

	this.inPlaylists = (function() {
		var playlists = [];
		_.each(oneTune.playlists(), function (playlist) {
			if (_.contains(playlist.tracks, song().id)) {
				playlists.push(playlist);
			}
		});
		return playlists;
	});

	this.isInPlaylist = (function(url) {
		var playlist = _.where(oneTune.playlists(), {url: url})[0];

		return _.contains(playlist.tracks, song().id)
	})

	this.playlistsLabel = (function() {
		var text;
		var l = this.inPlaylists().length;
		if (!oneTune.isLoggedIn()) {
			return 'Login to create playlists'
		}
		if (l == 0) {
			return 'Currently in no playlists'
		}
		if (l == 1) {
			return 'Currently in 1 playlist'
		}
		else {
			return 'Currently in ' + l + ' playlists'
		}
		return text;
	});

	this.toggleLibrary = function() {
		if (!this.isInLibrary()) {
			library.add(this.song())
		}
		else {
			library.remove(this.song())
		}
	};

	this.togglePlaylist = function(url) {
		if (!this.isInPlaylist(url)) {
			playlist.add(song(), url);
		}
		else {
			library.removeMultiple([song().id], 'playlist', url);
		}
	}
	this.isPlaylistOwner = function(url) {
		var playlist = _.where(oneTune.playlists(), {url: url})[0];
		return playlist.owner == oneTune.user()
	}


	this.getSong = function() {
		DB.getTracks({
			ids: [id],
			callback: function (local) {
				var afterTrackFound = function(_song) {
					song(_song);
					$.publish('new-tracks-entered-dom');
					$.publish('view-got-loaded');
				}

				if (local.length > 0) {
					afterTrackFound(local[0]);
				}
				else {
					$.ajax({
						url: '/api/song/' + id,
						dataType: 'json',
						success: function (data) {
							if (!data.success) {
								return errors.draw(data.error)
							}
							afterTrackFound(data.song);
							DB.addTrack(data.song);
						}
					});
				}
			}
		});
	}

	this.getSong();
}

function OneTune() {
	this.playlists = ko.observableArray(chinchilla.playlists);
	this.library = ko.observableArray(chinchilla.library);
	this.songs = ko.observableArray();
	this.nowPlaying = ko.observable();
	this.hearable = ko.observable();
	this.charts = ko.observable();
	this.reddit = ko.observable();
	this.retro = ko.observable();
	this.isLoggedIn = ko.observable(chinchilla.loggedin);
	this.user = ko.observable(chinchilla.user)

	ko.computed(function () {
		DB.getAllLibrarySongsSorted(this.library(), this.songs);
	}, this);
}

oneTune = new OneTune();
