/*
	Require the Swig module for templating.
*/
var swig        = 			require('swig'),
	_           = 			require('underscore'),
	db    		= 			require('../db/queries'),
	itunes      = 			require('../config/itunes'),
	charts      = 			require('../config/charts'),
	Lastfm      = 			require('lastfmapi'),
	helpers     = 			require('../frontend/scripts/helpers').helpers,
    recognition = 			require('../frontend/scripts/recognition').recognition,
    facebook	= 			require('../config/facebook'),
    cookies		= 			require('cookies'),
    workers		= 			require('../config/workers'),
    standards   = 			require('../config/standards'),
	jsonload 	= 			require('jsonreq'),
	lastfm  	= 			new Lastfm({
		api_key:    			process.env.LASTFM_API_KEY,
		secret:     			process.env.LASTFM_API_SECRET
	}),
    views   	= 			this,
    freebase 	= 			require('freebase'),
    freebtools  = 			require('../config/freebase'),
    metatags 	= 			require('../config/metatags'),
    moment 		= 			require('moment'),
    languages 	=			require('../config/languages'),
    translations=			require('../frontend/scripts/translations').translations,
	translate 	= 			translations.get,
	tracksfinder=			require('../config/tracks'),
	genius 		=			require('../config/genius'),
    queryjs 	= 			require('queryjs'),
    markdown 	= 			require('markdown').markdown,

    md 			= 			require('../config/markdown');
var analytics = require('../config/analytics');
/*
    Underscore config
*/
_.str = require('underscore.string');
_.mixin(_.str.exports());
_.str.include('Underscore.string', 'string');

/*
	Disable template cache for production environment
*/
if (process.env.server != 'production') {
	swig.setDefaults({ cache: false });
}
/*
	This is the current directory without the "/routes" at the end, so basically the parent directory
*/
var dirup = __dirname.substr(0, __dirname.length - 7);

/*
    Function for displaying duration correctly
*/
var	parseduration 	= 		helpers.parsetime,
	parsehours 		= 		helpers.parsehours,
	parsetext 		= 		helpers.parsetext,
	parseyear 		= 		helpers.parseyear,
	parseReleaseLeft=		helpers.parseReleaseLeft;

/*
	Views
*/
var templates 		= 		{
    album: 					dirup + '/sites/album.html',
    albumpage: 				dirup + '/sites/album-page.html',
    artist: 				dirup + '/sites/new-artist.html',
    artistfreebase: 		dirup + '/sites/artistfreebase.html',
    charts: 				dirup + '/sites/charts.html',
    genrecharts: 			dirup + '/sites/genrecharts.html',
    info: 					dirup + '/sites/info.html',
    library: 				dirup + '/sites/library.html',
    login: 					dirup + '/sites/login.html',
    lyrics: 				dirup + '/sites/lyrics.html',
    main: 					dirup + '/sites/main.html',
    newuser:                dirup + '/sites/new-user.html',
    playlistmenuitem: 		dirup + '/sites/playlistmenuitem.html',
    reddit: 				dirup + '/sites/reddit.html',
    redditbox: 				dirup + '/sites/reddit-box.html',
    redditplaylist: 		dirup + '/sites/redditplaylist.html',
    rmt: 					dirup + '/sites/rmt.html',
    registration:           dirup + '/sites/registration.html',
    retrocharts: 			dirup + '/sites/retro-charts.html',
    settings: 				dirup + '/sites/settings.html',
    submit: 				dirup + '/sites/submit.html',
    song: 					dirup + '/sites/song.html',
    startup: 				dirup + '/sites/infoscreen.html',
    templates: 				dirup + '/sites/templates.html',
    track: 					dirup + '/sites/track.html',
    tracklist: 				dirup + '/sites/tracklist.html',
    wrapper: 				dirup + '/sites/index.html',
    remote:					dirup + '/sites/remote.html',
    report: 				dirup + '/sites/report.html',
    select_username: 		dirup + '/sites/select_username.html',
    register: 				dirup + '/sites/register.html',
    redditdetail: 			dirup + '/sites/redditdetail.html',
    banner: 				dirup + '/sites/banner.html',
    banner2: 				dirup + '/sites/banner2.html',
    cache: 					dirup + '/sites/cache.html',
    user: 					dirup + '/sites/user.html',
    post: 					dirup + '/sites/post.html',
    services: 				dirup + '/sites/services.html',
    sub_posts: 				dirup + '/sites/sub_posts.html',
    privacy: 				dirup + '/sites/privacy.html',
    subs: 					dirup + '/sites/subs.html',
    mobile: 				dirup + '/sites/mobile.html',
    sway: 					dirup + '/sites/sway.html',
};

/*
    Routes
*/
this.artist 					= function(request, response) {
	var id 						= request.params.id,
	 	data 					= {
	 		type: 'artist',
	 		parsehours: 	parsehours,
	 		parseduration: 	parseduration,
	 		parsetext: 		parsetext,
	 		parseyear: 		parseyear,
	 		templates: 		templates,
	 		parseReleaseLeft: parseReleaseLeft
	 	},
	 	tmpl 					= swig.compileFile(templates.artist),
	 	afterUserFetch 			= function(user) {
	 		data.user 			= user;
	 		db.getArtist(id, afterArtistFetch);
	 	},
	 	afterArtistFetch 		= function(artistarray) {
	 		var artist 			= artistarray.length === 0 ? null : artistarray[0];
	 		if (!artist) {
	 			iTunesQuery(id);
	 		}
	 		else {
	 			data.artist 	= artist;
	 			afterArtistIsAvailable();
	 		}
	 	},
	 	iTunesQuery 			= function(id) {
	 		itunes.lookup(id, {entity: 'musicArtist'}, evaluateiTunesQuery)
	 	},
	 	evaluateiTunesQuery		= function(res, body) {
	 		if (!res) {
	 			db.insertErrorReport({
	 				title: 'iTunes query doesn\' return anything',
	 				description: 'This results in a error message saying that OneTune is under full load.',
	 				line: 'views.js:artist:evaluateiTunesQuery',
	 				debug: body
	 			});
	 			views.error({params: {code: 301}}, response);
	 			return;
	 		}
	 		var results = res.results;
	 		if (results.length == 0) {
				views.error({params: {code: 499}}, response);
	 		}
	 		else {
	 			var result 		= res.results[0];
	 			data.artist 	= {
	 					name: 	result.artistName,
	 					id: 	result.artistId,
	 					genre: 	result.primaryGenreName
	 				};
	 			getAllArtistTracks(id);
	 		}
	 	},
	 	getAllArtistTracks 		= function(id) {
	 		itunes.lookup(id, {entity: "song", limit: 1000}, afterAllArtistTracks);
	 	},
	 	afterAllArtistTracks 	= function(res, body) {
	 		if (!res) {
	 			db.insertErrorReport({
	 				title: 'iTunes query doesn\' return anything',
	 				description: 'This results in a error message saying that OneTune is under full load.',
	 				line: 'views.js:artist:afterAllArtistTracks',
	 				debug: body
	 			});
	 			views.error({params: {code: 301}}, response);
	 			return;
	 		}
	 		var songs 			= res.results,
	 			artist 			= songs.splice(0,1),
	 			tracks 			= _.map(songs, function(song) { return itunes.remap(song) }),
	 			ids 			= _.first(_.pluck(_.uniq(tracks, function (song) { return song.name }), 'id'), 10);
	 		data.artist.ids  	= ids;
	 		afterSongListIsReceived(tracks);
	 		db.addArtist(data.artist, function() {
	 		});
	 		db.addTracksBulk(tracks);
	 	},
	 	afterArtistIsAvailable 	= function() {
	 		db.getSongsByArtistId(data.artist.id, afterSongListIsReceived);
	 	},
	 	afterSongListIsReceived	= function(songs) {
	 		/*
				Create an object where we can save all albums to.
				Example: {45435345: *album*, 432423432: *album*}
	 		*/
	 		var albums 			= {};
	 		if (data.user) {
	 			var songs 			= _.map(songs, function(song) { song.inlib = _.contains(data.user.collections.library, song.id + ''); return song; });
	 		}

	 		/*
				Assign each song to an album
	 		*/
	 		_.each(songs, function(song) {
	 			/*
					Remove undefined songs
	 			*/
	 			if (song != undefined) {
	 				/*
						If this is the first track in an album,
	 				*/
	 				if (!albums[song.albumid]) {
	 					albums[song.albumid] = [];
	 				}
	 				albums[song.albumid].push(song);
	 			}

	 		});
	 		var sortedPopularityList = _.first(data.artist.ids, 10);
	 		var top10 = _.first(_.uniq(songs, function (song) { return song.name }) ,10);
	 		var top5 = top10.splice(0,5)
	 		data.top10 			= [{cds: [top5, top10], type: 'top10'}];
	 		var collections 	= [];
	 		_.each(albums, function(songs, name) {
	 			var albumarray 	= [];
	 			_.each(songs, function(song, k) {
	 				albumarray.push(song);
	 			});
	 			var albumarray = _.uniq(albumarray, false, function(song) { return song.id+'' });
	 			/*
					Sort by track number
	 			*/
	 			var albumarray 	= _.sortBy(albumarray, function(song) { return song.numberinalbum });
	 			/*
					Group by CD
	 			*/
	 			var cds  = _.values(_.groupBy(albumarray, function(song) { return song.cdinalbum }));
	 			var albuminfo 	= {
	 				cds: 		cds,
	 				id: 		albumarray[0].albumid,
	 				tracks: 	albumarray.length,
	 				artist: 	albumarray[0].artist,
	 				release: 	albumarray[0].release,
	 				image: 		albumarray[0].image,
	 				name: 		albumarray[0].album,
	 				hours: 		_.reduce(_.pluck(albumarray, 'duration'), function(memo, num) {return memo + parseFloat(num)}, 0),
	 				released: 	(new Date(albumarray[0].release) - new Date()) < 0
	 			}
	 			var albuminfo 	= helpers.albumRelevance(albuminfo, _);
	 			collections.push(albuminfo);
	 		});
	 		var collections 	= _.sortBy(collections, function(album) { return album.release }).reverse();
	 		var collections 	= _.filter(collections, function(album) { return album.tracks > 3 });
	 		var collections 	= _.map(collections, function(album) { return helpers.parseAlbumTitle(album) });
	 		var collections 	= _.uniq(collections, false, function(album) { return album.name });
	 		data.coverstack		= helpers.coverArrayToHQ(_.first(_.pluck(collections, 'image'), 4), 100);
	 		if (collections.length != 0) {
	 			data.headerimage 	= helpers.getHQAlbumImage({image: collections[0].image}, 1200);
	 		}
	 		data.albums 		= collections;
	 		freebaseSearch();

	 	},
	 	freebaseSearch 			= function() {
	 		/*
				Freebase killed for now! Skip to render.
	 		*/
	 		//if (!data.artist.freebase) {
	 		//	freebase.search(data.artist.name, {type: '/music/artist', limit: 1}, afterFreebaseSearch);
	 		//}
	 		//else {
	 		//	render();
	 		//}
	 		render();
	 	},
	 	afterFreebaseSearch 	= function(results) {
	 		if (results.length == 0) {
	 			data.artist.freebase = {};
	 			render();
	 		}
	 		else {
				var id = results[0].id;
				freebase.topic(id, {}, afterFreebaseTopic);
	 		}
	 	},
	 	afterFreebaseTopic 		= function(topics) {
	 		var info = topics.property;
	 		var keep = _.pick(info,
	 			'/common/topic/description',
	 			'/common/topic/alias',
	 			'/common/topic/image',
	 			'/common/topic/official_website',
	 			'/common/topic/social_media_presence',
	 			'/people/person/date_of_birth',
	 			'/people/person/employment_history',
	 			'/people/person/ethnicity',
	 			'/people/person/gender',
	 			'/people/person/height_meters',
	 			'/people/person/languages',
	 			'/people/person/nationality',
	 			'/people/person/parents',
	 			'/people/person/place_of_birth',
	 			'/people/deceased_person/cause_of_death',
	 			'/people/deceased_person/date_of_burial',
	 			'/people/deceased_person/date_of_death',
	 			'/people/deceased_person/place_of_burial',
	 			'/people/deceased_person/place_of_death',
	 			'/award/ranked_item/appears_in_ranked_lists',
	 			'/award/award_winner/awards_won',
	 			'/film/actor/film',
	 			'/music/artist/concert_tours',
	 			'/music/artist/genre',
	 			'/music/artist/label',
	 			'/music/artist/origin',
	 			'/music/artist/active_start',
	 			'/music/artist/active_end',
	 			'/music/musical_group/member',
	 			'/music/group_member/instruments_played',
	 			'/influence/influence_node/influenced_by',
	 			'/celebrities/celebrity/substance_abuse_problems'
	 		);
	 		data.artist.freebase = freebtools.remap(keep);
	 		db.saveFreebaseInfo(data.artist);
	 		render();
	 	},
	 	render 					= function() {
	 		response.end(tmpl(data));
	 	}
 	facebook.getLibraryFromRequest(request, afterUserFetch);
};
this.user 						= function (request, response) {
	if (!request.params.username) return;
	var tmpl = swig.compileFile(templates.user);
	var username = request.params.username,
		data = {};
	var afterUserFetched = function (user) {
		if (!user) {
			views.error({params: {code: 509}}, response);
			return;
		}
		data.user = user;
		db.getPublicPlaylistsFromUserId(data.user.id, afterPlaylistsFetched);
	}
	var afterPlaylistsFetched = function (playlists) {
		data.playlists = playlists;
		response.end(tmpl(data))
	}
	db.getUserByUsername(username, afterUserFetched);
}

this.privacy					= function(request, response) {
	var tmpl 			= swig.compileFile(templates.privacy),
		output 			= tmpl();

	response.end(output);
}

this.album 						= function(request, response) {
	var tmpl 			= swig.compileFile(templates.albumpage),
		id 				= parseInt(request.params.id),
		data 			= {
			parseduration: parseduration ,
			templates: templates,
			parsetext: parsetext,
			parseyear: parseyear,
			parsehours: parsehours,
			parseReleaseLeft: parseReleaseLeft,
			type: 'album'
		},
		onlynumbers		= new RegExp('^[0-9]+$'),
		render 			= function() {
			var output 	= tmpl(data);
			response.end(output);
		},
		renderError 					= function(code) {
			views.error({params: {code: code}}, response);
		},
		afterLibraryFetched 			= function(user) {
			data.user = user;
			db.getSingleAlbum(id, afterdbPerformed);
		};
		afterdbPerformed 			= function(album) {
			var album = (album.length == 0) ? null : album[0];
			if (album) {
				data.album = album;
				db.getTracksFromAlbum(id, afterAlbumTracksFetched)
			}
			else {
				itunes.lookup(id, {entity: 'song'}, function (itunesresponse, body) {
					if (!itunesresponse) {
						db.insertErrorReport({
							title: 'iTunes query doesn\' return anything',
							description: 'This results in a error message saying that OneTune is under full load.',
							line: 'views.js:album:afterdbPerformed',
							debug: body
						});
						renderError(506);
						return;
					}
					var info = itunesresponse.results
					if (info.length == 0)  {
						renderError(498);
					}
					data.album = info.splice(0,1)[0];
					data.songs = _.map(info, function(song) { return itunes.remap(song)});
					data.album = helpers.makeAlbum(data, _);
					if (!data.album) { renderError(498); }
	 				remapAlbums();
	 				if (data.album.released) {
	 					db.addAlbum(data.album);
	 					db.addTracksBulk(data.songs);
	 				}
				});
			}
		},
		afterAlbumTracksFetched 		= function(songs) {
			data.songs = songs;
			data.songs = _.uniq(data.songs, function(song) { return song.id + '' });
			remapAlbums();
		},
		remapAlbums 					= function() {
			if (data.user) {
				data.songs = _.map(data.songs, function(song) { song.inlib = _.contains(data.user.collections.library, song.id + ''); return song;})
			}
			if (!data.album) return;
			data.album.released = (new Date(data.album.release) - new Date()) < 0;
			data.album.cds = _.values(_.groupBy(_.sortBy(data.songs, function(song) { return song.numberinalbum }), function(song) { return  song.cdinalbum }));
			data.hqimage   = helpers.getHQAlbumImage(data.album, 400);
			data.headerimage = helpers.getHQAlbumImage(data.album, 1200);
			data.background= workers.returnAlbumCovers()
			render();
		}
		if (onlynumbers.test(id)) {
			facebook.getLibraryFromRequest(request, afterLibraryFetched)
		}
		else {
			renderError(501);
		}
}

this.lyrics = function(request, response) {
	var tmpl = swig.compileFile(templates.lyrics),
		id = request.params.id;

	tracksfinder.getTracksFromAllSources([id], function (song) {
		if (song && song[0]) {
			genius.getJS(song[0], function (js, genius_id) {
				if (js) {
					var output = tmpl({
						js: js,
						song: song[0],
						genius_id: genius_id
					});

					response.end(output);
				}
				else {
					views.error({params: {code: 495}}, response)
				}
			});
		}
	});


}

const allowed_users = (process.env.ALLOWED_USERS || '').split(',').filter(Boolean)

this.wrapper       				= function(request, response) {
	var tmpl 	= swig.compileFile(templates.wrapper),
		cookie 	= new cookies(request, response),
		token   = cookie.get('token'),
		data 	= {
			startup: templates.startup,
			isDesktop: request.query.desktop,
			sub: request.params.one || 'all',
			language: languages.getLanguage(request, response),
			translate: translate,
			rev: global.OneTune.git_rev
		},
		chinchilla = {
			playlists: [],
			settings: false,
			loggedin: false,
			user: null,
			token: false,
			language: data.language
		},
		betatesters = allowed_users,
		afterUserFetch = function(user) {
			data.user = user;
      // log user's visit and referer
      analytics.recordReferer(request.headers.referer, request.url, request.connection.remoteAddress, user && user._id);
      // continue with main flow
			if (user) {
				chinchilla.loggedin = true;
				chinchilla.user = user.id;
				chinchilla.token = user.token;
				chinchilla.username = user.username;

				chinchilla.settings = {}
				_.each(user.settings, function (setting)  { chinchilla.settings[setting.key] = setting.value  } )
					facebook.getLibraryFromRequest(request, afterLibraryFetched);
					if (_.contains(allowed_users, user.username)) {
						data.hostname = require("os").hostname();
					}
			}
			else {
				data.allowed = true;
				render();
			}
		},
		afterLibraryFetched = function(user) {
			if (!user) {
				data.user = null;
				data.playlists = '[]';
				render();
				return;
			}
			data.collection = user.collections;
			data.library 	= JSON.stringify(user.collections.library);
			chinchilla.library = user.collections.library;
			if (data.collection.playlists.length == 0 || !data || !data.user || !data.collection || !data.collection.playlists) {
				data.playlists = '[]';
				render();
			}
			else {
				db.getPlaylistsFromUserId(data.user.id, afterPlaylistsFetched);
			}
		},
		afterPlaylistsFetched = function(playlists) {
			data.playlists = playlists;
			data.playlists = _.map(data.playlists, function (playlist) {
				if (!playlist.followers) return playlist;
				playlist.followercount = playlist.followers.length;
				delete playlist.followers;
				return playlist;
			});
			db.getFollowedPlaylistsByUserId(data.user.id, afterFollowedPlaylistsFetched);
		},
		afterFollowedPlaylistsFetched = function (playlists) {
			data.followed_playlists = _.map(playlists, function (playlist) {
				if (!playlist.followers) return playlist;
				playlist.followercount = playlist.followers.length;
				delete playlist.followers;
				playlist.following = true;
				return playlist;
			});
			chinchilla.playlists = data.playlists.concat(data.followed_playlists);
			data.playlist_object = JSON.stringify(chinchilla.playlists);
			render();
		},
		getMetaTags = function() {
			metatags.get(request, afterMetaTags);
		},
		afterMetaTags = function(metatags) {
			data.metatags = metatags;
			getSubs();
		},
		getSubs = function() {
			data.subs = workers.getSubs();
			db.getUser(token, afterUserFetch);
		},
 		render 	= function() {
 			data.chinchilla = JSON.stringify(chinchilla);
 			var output  = tmpl(data);
 			response.end(output);
 		};
 	data.live = process.env.NODE_ENV == 'production';
 	data.templates = templates;
 	getMetaTags(request);
}
this.charts         			= function(request, response) {
	facebook.getLibraryFromRequest(request, function(user) {
		var tmpl        = swig.compileFile(templates.charts),
			songs 		= [],
			afterChartsFetched = function(table) {
				_.each(table, function(song) {
					if (song != undefined) {
						if (user) {
							song.inlib = (user && _.contains(user.collections.library, song.id));
						}
						songs.push(song);
					}

				});
				var	output      = tmpl({
						album:              {cds: [songs]},
						parseduration:      parseduration,
						parsetext: 			parsetext,
						showartistalbum:    true,
						coverstack:         helpers.coverArrayToHQ(_.pluck(_.first(songs, 4), 'image'), 100),
						user: 				user,
						type: 				'charts',
						templates: 			templates
					});
				response.end(output);
			},
			table       = charts.getCharts(afterChartsFetched);
	});
};
this.genrecharts 				= function (request, response) {
	var sub = workers.getSub(request.params.sub),
		tmpl = swig.compileFile(templates.genrecharts),
		songs = [];
	if (!sub) {
		views.error({params: {code: 508}}, response);
		return;
	}
	var tracks = charts.genres[sub.itunes];
	var afterLibraryFetched = function (user) {
		_.each(tracks, function (song) {
			if (song != undefined) {
				if (user) {
					song.inlib = (user && _.contains(user.collections.library, song.id));
				}
				songs.push(song);
			}
		});
		var output = tmpl({
			album:              {cds: [songs]},
			parseduration:      parseduration,
			parsetext: 			parsetext,
			showartistalbum:    true,
			coverstack:         helpers.coverArrayToHQ(_.pluck(_.first(songs, 4), 'image'), 100),
			user: 				user,
			type: 				'charts',
			templates: 			templates,
			sub: 				sub
		});

		response.end(output);
	}
	facebook.getLibraryFromRequest(request, afterLibraryFetched);
}
this.retrocharts 				= function(request, response) {
	var tmpl 				= swig.compileFile(templates.retrocharts),
		year 				= request.params.year,
		data 				= {
			parseduration: parseduration,
			parsetext: parsetext,
			showartistalbum: true,
			type: 'retrocharts',
			templates: templates,
			range: workers.getYearRange()
		},
		afterIdsFetched 	= function(chart) {
			if (chart) {
				data.year = chart.year;
				db.getSongsByIdList(chart.charts, afterChartsFetched);
			}
			else {
				render();
			}
		},
		afterChartsFetched 	= function(table) {
			data.table = table;
			checkUser();
		},
		checkUser 			= function() {
			facebook.getLibraryFromRequest(request, afterLibraryFetched);
		},
		afterLibraryFetched = function(user) {
			if (user) {
				data.user = user;
				data.table = _.map(data.table, function(song) { song.inlib = _.contains(user.collections.library, song.id + ''); return song});
			}
			data.album = {cds: [data.table]};
			data.coverstack = helpers.coverArrayToHQ(_.pluck(_.first(data.table, 4), 'image'), 100);
			render();
		},
		render 				= function() {
			var output = tmpl(data);
			response.end(output);
		}
		db.getRetroCharts(year, afterIdsFetched);
}
this.error          			= function(request, response) {
	var tmpl        = swig.compileFile(dirup + "/sites/error.html"),
		error       = request.params.code,
		messages = {
			301: "Phew... quite a lot of people are using OneTune right now. Our servers are under full load.",
			404: "We couldn't find that page.",
			499: "It seems like this artist doesn't exist. ",
			498: "Whoops... this album doesn't seem to exist. ",
            497: "Sorry... this track doesn't seem to exist.",
            501: "The URL contains invalid characters. Only numbers and letters are allowed.",
            496: "Sorry, there aren't any lyrics for this song.",
            495: "We couldn't fetch the lyrics for this song. There might be license issues.",
            494: "We received no response for your lyrics request.",
            493: "There seems to be a problem with the lyrics server.",
            502: "This playlist doesn't seem to exist.",
            503: "This playlist is private, but you are not logged in.",
            504: "This playlist is private. Please ask the crator of the playlist to make it public.",
			505: "This track can't be reported because it is not in our database.",
			506: "We can't connect to iTunes right now. Please try again later.",
			507: "The YouTube video couldn't be found. It probably was deleted.",
			508: "We don't have this genre/subreddit, sorry.",
			509: "This user doesn't exist.",
			510: "This post doesn't exist."
		},
		message     = messages[error],
		phrase      = message !== undefined ? message : "Super fail: Not only that something didn't work, we also don't know what this error code means.",
        output      = tmpl({error: phrase});
	response.end(output);
};
this.info          				= function(request, response) {
	var tmpl 	= swig.compileFile(templates.info),
		output 	= tmpl({});
  	analytics.recordAccess(request, response);
	response.end(output);

};
this.sway						= function(request, response) {
	var tmpl 	= swig.compileFile(templates.sway),
		output 	= tmpl();
	response.end(output);
}
this.banner          			= function(request, response) {
	var tmpl 	= swig.compileFile(templates.banner),
		output 	= tmpl({});
	response.end(output);
};
this.banner2 					= function(request, response) {
	response.sendfile(templates.banner2);
}
this.cache 							= function(request, response) {
	response.sendfile(templates.cache);
}
this.library 					= function(request, response) {
	var tmpl = swig.compileFile(templates.library),
		data = {
			templates: templates,
			parseduration: parseduration,
			parsetext: 	parsetext,
			showartistalbum: true,
			type: 'library'
		},
		afterFacebookLoginStateChecked = function(user) {
			if (user) {
				data.user = user;
				db.getUserCollections(user, afterUserCollectionsFetched)
			}
			else {
				render()
			}
		},
		afterUserCollectionsFetched 	= function(collections) {
			data.collections = collections;
			if (collections.library.length == 0) {
				data.album = {cds: []};
				render();
			}
			else {
				db.getSongsByIdList(collections.library, afterSongListIsReceived);
			}
		},
		afterSongListIsReceived 		= function(songs) {
			var tracks = _.map(songs.reverse(), function(song) { song.inlib = true; return song; });
			data.coverstack = helpers.coverArrayToHQ(_.first(_.uniq(_.pluck(_.first(tracks, 15), 'image')), 9), 150);
			data.album = {cds: [tracks]};
			render();
		},
		render 							= function() {
			var output = tmpl(data);
			response.end(output);
		}
	facebook.checkLoginState(request, afterFacebookLoginStateChecked)
};
this.main 						= function(request, response) {
	var tmpl = swig.compileFile(templates.main),
		cookie = new cookies(request, response),
		data = {
			templates: templates,
			type: 'home',
			parseduration: parseduration,
			parsetext: parsetext,
			parsehours: parsehours
		},
		afterLogin 			= function(user) {
			data.user 		= user;
			if (user) {
				data.user.loggedin = true;
				db.getUserCollections(user, afterCollection)
			}
			else {
				getCharts();
			}
		},
		afterCollection 	= function(collections) {
			var library 	= collections.library,
				first5 		= _.last(library, 8).reverse();
			data.inlibrary  = library;
			if (first5.length == 0) {
				getCharts();
			}
			else {
				db.getSongsByIdList(first5, afterIdList);
			}
		},
		afterIdList			= function(songs) {
			/*
				Add inlib to all songs
			*/
			var songs 		= _.map(songs, function(song) {song.inlib = true; return song;});
			data.library = _.map(songs, function(song) {
				return {
					song: song,
					hqimg: helpers.getHQAlbumImage(song, 100)
				}
			});
			getCharts();
		},
		getCharts 		 	= function() {
			var top20 		= _.first(charts.getFirstTwenty(), 8);
			var top20 		= _.map(top20, function(song) { song.inlib = (data.user && _.contains(data.inlibrary, song.id)); return song; });
			var top20 		= _.compact(top20);
			data.charts 	= _.map(top20, function(song) {
				return {
					song: song,
					hqimg: helpers.getHQAlbumImage(song, 100)
				}
			});
			var range 		= workers.getYearRange();
			data.randomyear  = range[Math.floor(Math.random()*range.length)];
			db.getRetroCharts(data.randomyear, evaluateRetroCharts);
		},
		evaluateRetroCharts = function(charts) {
			if (charts) {
				db.getSongsByIdList(_.first(charts.charts, 8), throwTogether);
			}
			else {
				throwTogether({});
			}

		},
		throwTogether		= function(topanno) {
			data.topanno 	= _.map(topanno, function(song) {
				return {
					song: song,
					hqimg: helpers.getHQAlbumImage(song, 100)
				}
			});
				redditsongs	= _.first(_.shuffle(workers.returnRedditSongs('Music')), 8);
			_.map(redditsongs, function(reddit) {
				reddit.inlib= (data.user && _.contains(data.inlibrary, reddit.song.id + ''));
				return reddit;
			});
			data.topanno 	= _.map(data.topanno, function(song) {
				song.inlib 	= (data.user && _.contains(data.inlibrary, song.song.id + ''));
				return song;
			});
			data.charts 	= _.map(data.charts, function(song) {
				song.inlib 	= (data.user && _.contains(data.inlibrary, song.song.id + ''));
				return song;
			});
			data.library 	= _.map(data.library, function(song) {
				song.inlib 	= (data.user && _.contains(data.inlibrary, song.song.id + ''));
				return song;
			});
			data.redditsongs= redditsongs;
			render();
		}
		render 				= function() {
			var output 		= tmpl(data);
			response.end(output);
		}
	data.firsttime = !cookie.get('not_firsttime');
	if (data.firsttime) {
		cookie.set('not_firsttime', 'true', {expires: new Date(2030, 10, 1, 1, 1, 1, 1), httpOnly: false});
	}
	facebook.checkLoginState(request, afterLogin);
};
this.reddit 					= function(request, response) {
	var tmpl = swig.compileFile(templates.reddit),
		subreddits = workers.returnSubreddits(),
		data = {
			templates: templates,
			type: 'reddit',
			parseduration: parseduration,
			parsehours: parsehours,
			parsetext: parsetext,
			music: []
		},
		afterLogin			= function(user) {
			data.user 		= user;
			if (user) {
				data.user.loggedin = true;
				db.getUserCollections(user, afterCollection);
			}
			else {
				buildPage()
			}
		},
		afterCollection		= function(collections) {
			data.library = collections.library;
			buildPage();
		}
		buildPage 			= function() {
			_.each(subreddits, function(subreddit) {
				var songs = _.first(workers.returnRedditSongs(subreddit), 6);
				if (data.user) {
					songs = _.map(songs, function(song) { song.inlib = _.contains(data.library, song.song.id); return song; });
				}
				if (songs != undefined) {
					data.music.push({songs: songs, name: subreddit});
				}
			});
			var arrays = _.pluck(data.music, 'songs');
			var tracksonly = _.pluck(_.reduceRight(arrays, function(a, b) { return a.concat(b); }, []), 'song');
			data.coverstack = _.first(_.pluck(tracksonly, 'image'), 9);
			render();
		},
		render 				= function() {
			var output = tmpl(data);
			response.end(output);
		}
	facebook.checkLoginState(request, afterLogin);
}
this.redditdetail 				= function(request, response) {
	var tmpl 				= swig.compileFile(templates.redditdetail),
	cookie 					= new cookies(request, response),
	token 					= cookie.get('token');
	subreddit = workers.returnRedditSongs(request.params.subreddit),
	data = {
		templates: templates,
		parseduration: parseduration,
		parsetext: parsetext,
		parsehours: parsehours,
		showartistalbum: true,
		type: 'reddit-detailed',
		subreddit: request.params.subreddit
	},
	afterLibraryFetched = function(user) {
		var songs = [];
		_.each(_.pluck(subreddit, 'song'), function(song) {
			if (song != undefined) {
				if (user) {
					song.inlib = (user && _.contains(user.collections.library, song.id));
				}
				songs.push(song);
			}
		});
		data.coverstack = helpers.coverArrayToHQ(_.pluck(_.first(songs, 4), 'image'), 100);
		data.user = user;
		data.album = {cds: [songs]};
		db.getUser(token, afterUserFetched);
	},
	afterUserFetched = function (user) {
			if (user) {
				data.hostname = require("os").hostname();
			}
			var output = tmpl(data);
			response.end(output);
	};

	if (subreddit) {
		facebook.getLibraryFromRequest(request, afterLibraryFetched);
	}
	else {
		views.error({params: {code: 508}}, response);
	}

}
this.redditpl 					= function(request,response)  {
	var tmpl 				= swig.compileFile(templates.redditplaylist),
	cookie 					= new cookies(request, response),
	token 					= cookie.get('token'),
	data 					= {
		templates: 				templates,
		parseduration: 			parseduration,
		parsetext: 				parsetext,
		showartistalbum: 		true
	};
	var afterUserFetched 	= function(user) {
		if (user) {
			data.user 		= user;
			db.getUserCollections(user, afterLibraryFetched);
		}
		else {
			afterLibraryFetched()
		}
	},
	afterLibraryFetched		= function(collections) {
		if (data.user) {
			data.library 	= collections.library;
		}
		var playlist 		= '/reddit-playlist/' + request.params.id;
		db.getRedditThread(request.params.id, afterPlaylistFetched);
	},
	afterPlaylistFetched 	= function(playlist) {
		if (!playlist) {
			views.error({params: {code: 502}}, response);
			return;
		}
		data.playlist 		= playlist;
		var tracks 			= playlist.trackids;
		if (tracks.length 	== 0) {
			data.album 		= {cds: [[]]};
			render();
		}
		else {
			db.getSongsByIdList(tracks, afterTracksFetched);
		}
	},
	afterTracksFetched 		= function(tracks) {
		if (data.user) {
			_.map(tracks, function(track) {track.inlib = _.contains(data.library, track.id + ''); return track; });
		}
		data.album 			= {cds: [tracks]};
		data.playlist.rawduration 	= _.reduce(tracks, function (a,b) { return a + parseFloat(b.duration) }, 0);
		data.playlist.duration 		= helpers.parsehours(data.playlist.rawduration);
		data.playlist.trackcount 	= tracks.length;
		data.coverstack 	= _.first(_.pluck(tracks, 'image'), 9);
		render();
	},
	render 					= function() {
		var output 			= tmpl(data);
		response.end(output);
	}
	db.getUser(token, afterUserFetched)
}
this.rmt 						= function(request, response) {
	var tmpl 		= swig.compileFile(templates.rmt),
		output		= tmpl();
	response.end(output);
}
this.remote 					= function(request, response) {
	var tmpl 		= swig.compileFile(templates.remote),
		data 		= { code: helpers.createID(5) },
		output		= tmpl(data);
	response.end(output);
}
this.submit 					= function(request, response) {
	var tmpl 		= swig.compileFile(templates.submit),
		cookie 		= new cookies(request, response),
		token 		= cookie.get('token'),
		data 		= {
			subs: workers.getSubs()
		}
	var afterUserFetched = function (user) {
		if (user) {
			data.user = user;
		}

		/*
			Preselect sub
		*/
		if (request.query.sub) {
			data.selected = request.query.sub
		}
		if (request.query.entity) {
			db.findOneTrack(request.query.id, afterSongIsFetched);
		}
		else {
			render();
		}
	},
	afterSongIsFetched = function (song) {
		if (song) {
			data.song = song;
		}
		render();
	},
	render = function() {
		data.sub = workers.getSub(request.query.sub);
		if (data.sub) {
			data.sub.type = 'submit'
		}
		var output 		= tmpl(data);
		response.end(output);
	}
	db.getUser(token, afterUserFetched);
}
this.saveLastfm = function(request, token, username, callback) {
	var cookie = new cookies(request);
	var _token = cookie.get('token');
	var afterUserFetched = function (user) {
		if (!user) {
			return callback(false);
		}
		db.addLastfmToken(user, token, username, function () {
			callback(true);
		});
	}
	db.getUser(_token, afterUserFetched);
}
this.getLastfm = function(request, callback) {
	var cookie = new cookies(request);
	var token = cookie.get('token');
	var afterUserFetched = function (user) {
		if (!user) {
			return callback(false)
		}
		db.getLastfmToken(user, callback)
	}
	db.getUser(token, afterUserFetched)
}
this.services = function(request, response) {
	var cookie = new cookies(request);
	var token = cookie.get('token');
	var tmpl = swig.compileFile(templates.services);
	var afterUserFetched = function (user) {
		if (!user) {
			return response.end('Please log in to connect your account to services!');
		}
		db.getServicesFromUser(user, afterServicesFetched)
	}
	var afterServicesFetched = function(services) {
		var output = tmpl({services: services})
		response.end(output);
	}
	db.getUser(token, afterUserFetched);
}
this.post = function(request, response) {
	var data = request.query;
	var tmpl = swig.compileFile(templates.post);
	var cookie = new cookies(request, response);
	var token = cookie.get('token');
	var afterPostFetched = function(post) {
		if (!post) {
			views.error({params: {code: 510}}, response);
			return;
		}
		data.post = post;
		data.timestamp = moment(data.post.date).fromNow();
		var plurals = {
			song: 'songs',
			playlist: 'playlists',
			story: 'stories'
		}
		data.plural = plurals[post.entity];

		if (data.user) {
			post.upvoted = _.contains(post.upvoters, data.user.username);
			post.downvoted = _.contains(post.downvoters, data.user.username);
			post.vote = post.upvoted ? 1 : (post.downvoted ? -1 : 0);
			post.deletable = (post.user == data.user.username);
		}
		post.timestamp = moment(post.date).fromNow();

		if (post.entity == 'song') {
			getSong();
		}
		else if (post.entity == 'playlist') {
			getPlaylist();
		}
		else if (post.entity == 'story') {
			data.title = data.post.title;
			getLinks();
		}
	},
	afterUserFetched = function(user) {
		data.user = user;
		db.getPost(data.sub, data.post, afterPostFetched);
	},
	getLinks = function() {
		data.html = markdown.toHTML(data.post.content);
		var matches = _.uniq(data.html.match(/\[\[song [0-9]+\]\]/g));
		if (matches.length > 0) {
			getPostSongLinks(matches);
		}
		else {
			afterPostSongLinksReplaced();
		}
	},
	getPostSongLinks = function(matches) {
		var ids = _.map(matches, function (m) { return m.replace('[[song ', '').replace(']]', '') });
		db.getSongsByIdList(ids, function (results) {
			_.each(results, function (result) {
				var replregex = new RegExp('\\[\\[song '+ result.id +'\\]\\]');
				data.html = data.html.replace(replregex, '<a class="inline-song" data-navigate="/song/' + result.id + '"><img src="' + result.image + '">' + result.name +' - ' + result.artist + '</a>');
			});
			afterPostSongLinksReplaced();
		});
	},
	afterPostSongLinksReplaced = function() {
		getComments();
	},
	getSong = function() {
		db.getSingleTrack(data.post.song, afterSongIsFetched);
	},
	getPlaylist = function() {
		db.getPlaylist(data.post.playlist, afterPlaylistFetched);
	},
	afterPlaylistFetched = function(playlist) {
		data.playlist = playlist;
		data.title = data.playlist.name;
		getComments();
	},
	afterSongIsFetched = function(song) {
		data.post.info = song[0];
		data.title = data.post.info.name;
		getComments();
	},
	afterCommentsFetched = function(comments) {
		data.comment_count = comments.length;
		data.comment_label = data.comment_count + (data.comment_count == 1 ? 'comment' : 'comments')
		data.comments = _.map(comments, function (comment) {
			comment.rel_timestamp = moment(comment.date).fromNow();
			if (data.user) {
				comment.upvoted = _.contains(comment.upvoters, data.user.username);
				comment.downvoted = _.contains(comment.downvoters, data.user.username);
				comment.vote = comment.upvoted ? 1 : (comment.downvoted ? -1 : 0);
				comment.deletable = (comment.submitter == data.user.username);
			}
			return comment;
		});
		data.comments = md.convertCommentsToHTML(data.comments);
		data.comments = _.reject(data.comments, function (comment, key) {
			if (comment.reply_to) {
				data.comments = _.map(data.comments, function (cmt) {
					if (cmt._id.toString() == comment.reply_to) {
						if (!cmt.replies) { cmt.replies = []; }
						cmt.replies.push(comment);
					}
					return cmt;
				});
				return true;
			}
		});

		render();
	},
	getComments = function() {
		db.getComments(data.post.slug, afterCommentsFetched, data.sort);
	},
	render  = function() {
		data.sub = workers.getSub(request.query.sub);
		var output = tmpl(data);
		md.addInlinesToHTML(output, function (html) {
			response.end(html);
		});
	}
	db.getUser(token, afterUserFetched);
}
this.settings					= function(request, response) {
	var tmpl = swig.compileFile(templates.settings),
		cookie = new cookies(request, response),
		token = cookie.get('token');
	if (!token) {
		response.end('<div class="material-box" style="margin: 20px"><p>You need to login to save settings.</p></div>');
	}
	else {
		db.getUser(token, function(user) {
			if (user) {
				/*
					Add new settings/remove deprecated settings
				*/
				var settings = [];
				_.each(standards.settings, function(setting, key) {
						var stg = user ? _.where(user.settings, {key: setting.key}) : [];
					if (stg.length !== 0) {
						settings.push(stg[0])
					}
					else {
						settings.push(setting)
					}
				});
				user.settings = settings;
				/*
					Render settings
				*/
				var output = tmpl({
					user: user,
					langs: languages.supported_languages
				});
				response.end(output);
			}
		});
	}
}
this.report 					= function(request, response) {
	var tmpl = swig.compileFile(templates.report);
	db.getSingleTrack(request.params.id + '', function(song) {
		if (song.length == 0) { views.error({params: {code: 505}}, response); }
		var output = tmpl({
			song: song[0],
			json: JSON.stringify(song[0])
		});
		response.end(output);
	});
}
this.select_username 				= function(request, response) {
	var tmpl = swig.compileFile(templates.select_username);
	var _id = request.params.name;
	db.getProvisionalUser(_id, function (user_object) {
		var output = tmpl(user_object);
		response.end(output);
	});
}
this.sub_posts 						= function(request, response) {
	var url = require('url').parse(request.url).pathname
	var tmpl = swig.compileFile(templates.sub_posts);
	var sub = request.params.sub;
	/*
		l = label
		o = object
		s = string
	*/
	var singular = {
		songs: 'song',
		playlists: 'playlist',
		stories: 'story'
	}
  analytics.recordAccess(request, response);
	var data = {
		sub: request.params.sub,
		entity: url.substr(url.lastIndexOf('/')+1),

		ranking_o: {"top": "top", "new": "new"},
		type_o: {"songs": "songs", "playlists": "playlists", "stories": "stories"},
		time_o: {"last_hour": "last hour", "today": "today", "this_week": "this week", "this_month": "this month", "all_time": "all time"},
	};
	data.time_s =  JSON.stringify(data.time_o);
	data.ranking_s =  JSON.stringify(data.ranking_o);
	data.type_s =  JSON.stringify(data.type_o);

	data.time =  request.query.time || 'all_time';
	data.ranking =  request.query.ranking || 'top';
	data.type =  data.entity || 'songs';

	data.time_l = data.time_o[data.time];
	data.ranking_l = data.ranking_o[data.ranking];
	data.type_l = data.type_o[data.type];

	var cookie = new cookies(request, response);
	var token = cookie.get('token');
	var query = request.query;

	var posts_per_page = 20;
	var afterPostsFetched = function(posts, count) {
		if (query.page && parseInt(query.page) > 1) {
			data.prev = queryjs.set(request.url, {page: parseInt(query.page)-1}).replace('/api', '/one');
		}
		else {
			query.page = 1;
		}
		var moreresults = (parseInt(query.page)+1)*posts_per_page-1 < count;
		if (moreresults) {
			data.next = queryjs.set(request.url, {page: parseInt(query.page)+1}).replace('/api', '/one');
		}
		data.page = query.page;
		if (posts.length > 0) {
			data.posts = posts;
		}
		if (data.entity == 'songs') {
			getTracksFromDb();
		}
		else if (data.entity == 'playlists') {
			render();
		}
		else if (data.entity == 'stories') {
			render();
		}
	}
	var getTracksFromDb = function() {
		data.tracksInOrder = []
		db.getSongsByIdList(_.pluck(data.posts, 'song'), function (songs) {
			data.posts = _.map(data.posts, function (post) {
				post.info = _.find(songs, function (s) {
					return s.id == post.song
				});
				return post;
			});
			render();
		});
	}
	var render = function() {
		data.tracksInOrder = _.map(data.posts, function (post) {
			if (data.user) {
				post.upvoted = _.contains(post.upvoters, data.user.username);
				post.downvoted = _.contains(post.downvoters, data.user.username);
				post.votes = post.upvoters.length - post.downvoters.length;
				post.vote = post.upvoted ? 1 : (post.downvoted ? -1 : 0);
				post.deletable = (post.user == data.user.username);
			}
			post.timestamp = moment(post.date).fromNow();
			return post;
		});
		data.sub = workers.getSub(sub);
		if (!data.sub) {
			data.sub = {
				header: 'https://s3.amazonaws.com/onetune/homepage-banner.jpg'
			}
		}
		if (data) {
			data.sub.type = data.type;
			data.sub.ranking = data.ranking;
		}
		var output = tmpl(data);
		response.end(output);
	}
	var afterUserFetched = function(user) {
		if (user) {
			data.user = user;
		}
		var after = 0;
		if (data.time == 'last_hour') {
			after = Date.now() - 3600*1000
		}
		if (data.time == 'today') {
			after = Date.now() - 24*3600*1000
		}
		if (data.time == 'this_week') {
			after = Date.now() - 7*24*3600*1000
		}
		if (data.time == 'this_month') {
			after = Date.now() - 30*7*24*3600*1000
		}
		db.getPosts(sub, afterPostsFetched, {after: after, ranking: data.ranking, posts_per_page: posts_per_page, page: query.page, type: singular[data.type]});
	}
	db.getUser(token, afterUserFetched);
}
this.register 						= function(request, response) {
	var tmpl = swig.compileFile(templates.register);
	response.end(tmpl());
}
this.subs 						= function(request, response) {
	response.end(tmpl());
}
this.subs 							= function(request, response) {
	var subs = _.map(workers.getSubs(), function (sub) {
		delete sub.type;
		return sub;
	})
	var tmpl = swig.compileFile(templates.subs);
	var data = {
		subs: subs
	}
	response.end(tmpl(data));
}
this.mobile          			= function(request, response) {
	var tmpl = swig.compileFile(templates.mobile);
	response.end(tmpl());
};
