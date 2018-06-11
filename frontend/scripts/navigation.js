// views object defined in fetchFeeds.js
// radio object defined in radio-client.js
// player object defined in player.js
// showYoutubePage defined in UI.js
// showImportPage defined in UI.js
routes = {
	'/charts':              	function(match) {
		views.charts.load();
	},
	'/album/:id':           	function(match) {
		views.album.load(match[1]);
	},
	'/about':               	function(match) {
		views.about.load();
	},
    '/track/:id':           	function(match) {
        views.track.load(match[1]);
    },
    '/register':        		function(match) {
        registration.facebook.load();
    },
    '/library': 				function(match) {
    	views.library.load();
    },
    '/new-playlist': 			function(match) {
    	views.playlistsplash.load();
    },
    '/settings': 				function(match) {
    	views.settings.get();
    },
	'/home':                	function(match) {
		views.main.get();
	},
	'/artist/:id': 				function(match) {
		views.artist.load(match[1]);
	},
	'/lyrics/:name': 				function(match) {
		views.lyrics.load(match[1]);
	},
	'/u/:name/p/:name': 		function(match) {
		views.playlist.load(match[0]);
		$('#drop-target-label').text('this playlist')
	},
	'/thread/:name': 			function(match) {
		views.redditpl.load(match[1]);
	},
	'/genres': 					function(match) {
		views.reddit.load();
	},
	'/': 						function(match) {
		views.main.get();
	},
	'/song/:name': 				function(match) {
		views.song.load(match[1]);
	},
	'/time-machine/:id':		function(match) {
		views.retrocharts.load(match[1]);
	},
	'/logout': 					function(match) {
		window.location = '/logout';
	},
	'/login': 					function(match) {
		window.location = '/auth/facebook'
	},
	'/info': 					function(match) {
		views.info.load();
	},
	'/remote': 					function(match) {
		views.remote.get();
	},
	'/youtube': 				function(match) {
		showYouTubePage();
		views.loadingindicator.hide();
	},
	'/import': 					function(match) {
		showImportPage();
		views.loadingindicator.hide();
	},
	'/radio': 					function(match) {
		radio.showRadioPage();
		views.loadingindicator.hide();
	},
	'/report/:id': 				function(match) {
		player.pause();
		views.report.load(match[1]);
	},
	'/select_username/:name': 	function(match) {
		views.select_username.load(match[1]);
	},
	'/register': 				function() {
		views.register.load();
	},
	'/r/:name': 				function(match) {
		views.redditdetail.load(match[1]);
	},
	'/one': 					function(match) {
		views.subs.load();
	},
	'/submit': 					function(match) {
		views.submit.load();
	},
	'/one/submit': 				function(match) {
		views.submit.load();
	},
	'/one/:name': 				function(match) {
		views.one.load(match[1]);
	},
	'/one/submit/:name/:name': 	function(match) {
		views.submit.load(null, match[1], match[2])
	},
	'/one/:name/submit': 		function(match) {
		views.submit.load(match[1]);
	},
	'/one/:name/submit/:name/:name': function(match) {
		views.submit.load(match[1], match[2], match[3]);
	},
	'/u/:name': 				function(match) {
		views.user.load(match[1]);
	},
	'/one/:name/:name/:name': function(match) {
		views.posts.load(match[1], match[2]);
	},
	'/one/:name/songs': function(match) {
		views.posts.loadList(match[1], 'songs');
	},
	'/one/:name/playlists': function(match) {
		views.posts.loadList(match[1], 'playlists');
	},
	'/one/:name/stories': function(match) {
		views.posts.loadList(match[1], 'stories');
	},
	'/songs': function(match) {
		views.posts.loadList(null, 'songs');
	},
	'/playlists': function(match) {
		views.posts.loadList(null, 'playlists');
	},
	'/stories': function(match) {
		views.posts.loadList(null, 'stories');
	},
	'/one/:name/charts': function(match) {
		views.charts.loadGenre(match[1]);
	},
	'/privacy': function(match) {
		views.privacy.load();
	},
	'/sway': function(match) {
		views.sway.load();
	},
	'/services': function(match) {
		views.services.load();
	}
};
var navfunction = function(e) {
	/* Prevent right-click navigation - for contextmenus */
	if (e.button == 2) {
		return;
	}
	var pathname            = $(this).attr('data-navigate');
	e.preventDefault();
	navigation.to(pathname);
}
$(document)
.on('ready', function() {
	var pathname            = window.location.pathname + window.location.search;
	navigation.to(pathname);
})
.on('mousedown', '[data-navigate]:not(.navigateup)', navfunction)
.on('click', '[data-navigate].navigateup', navfunction)
var showSpinner = function() {
	$('#view,#loading-indicator').addClass('loading-indicator-visible')
};
loader = {
	spinner: function() {
		return '<div class="loading-indicator"><div class="spinner"></div></div>';
	}
}
navigation = {
	to: function(path, prevent) {
		/*
			Highlight current view in menu
		*/
		var classname = 'menuselected';
		var currentroute = {
			path: path,
			timestamp: Date.now()
		}
		var tsdiff = currentroute.timestamp - window.currentroute.timestamp;
		var issameroute = currentroute.path == window.currentroute.path;
		if (issameroute && currentroute.path == '/youtube') {
			window.history.back();
			return;
		}
		if (tsdiff > 3000 || !issameroute) {
			window.currentroute = currentroute
		}
		else {
			return;
		}
		$.each(routes, function (route, callback) {
			var pathonly = path.substr(0, path.indexOf('?') == -1 ? path.length: path.indexOf('?'));
			var routeMatcher	= new RegExp('^' + route.replace(/:[name]+/g, '([\\a-zA-Z0-9\-_\.]+)').replace(/:[id]+/g, '([\\d]+)') + '$'),
				match           = pathonly.match(routeMatcher);
			if ((match && match != '/') || (match == '/' && path == '/')) {
				$('.' + classname).removeClass(classname);
				$('#sidebar, #right-sidebar').find('[data-navigate="' + path + '"]').addClass(classname);
				$('#drop-target-label').text('your library');
				hideYouTubePage();
				showSpinner();
				var method = prevent ? 'replaceState' : 'pushState';
				if (match == '/' && path == '/') {
					console.log('/', window.currentroute)
				}
				history[method](null, null, path);
				callback(match);
				$.publish('view-gets-loaded')
				$('#view').attr('data-route', path)
				return false;
			}
		});
	}
};
window.onpopstate = function() {
	var pathname			= window.location.pathname;
	if (window.currentroute.path == pathname) return;
	navigation.to(pathname + window.location.search, true);
}
window.currentroute = {
	path: '',
	timestamp: Date.now()
}
