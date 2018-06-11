/*
	Require the basic stuff like the express framework hello
*/
var express     	= require('express')
	app         	= express(),
	http 			= require('http'),
	server	        = http.createServer(app),
	views       	= require('./routes/views'),
	styles      	= require('./routes/styles'),
	admin       	= require('./admin/admin'),
	events      	= require('./config/events'),
	charts      	= require('./config/charts'),
	fb          	= require('./config/facebook'),
	webhook 		= require('./config/webhook'),
	reddit          = require('./config/reddit'),
	proxy 			= require('./config/proxy'),
	api 			= require('./routes/api'),
	db 				= require('./db/queries'),
	st 				= require('st');
	bodyparser 		= require('body-parser'),
	manifest 		= require('./routes/manifest'),
	gitrev 			= require('git-rev'),
	st 				= require('st'),
	_package 		= require('./package'),
	embed 			= require('./embed'),
	swig 			= require('swig'),
	// Scoped packages. It's a new npm feature.
	lastfm 			= require('@jonny/onetune-lastfm');

global.OneTune = {
	version: _package.version
};

gitrev.long(function(rev) {
	global.OneTune.git_rev = rev;
});

/*
	Listen to port 5000, or, in production, 80;
*/
server.listen(process.env.PORT || 5000);

process.on('uncaughtException', function (error) {
	console.log(error.stack);
	db.insertErrorReport({
		title: 'Server crash',
		description: 'Something caused the server to crash.',
		debug: error.stack
	}, function() {
		process.exit(1);
	});
});

/*
 * This is a simple logger to print calls in development
 */
/*
app.use(function (req, res, next) {
  console.log('%s %s', req.method, req.url);
  next();
});
*/

/*
	Fast CSS and JS delivery
*/
var mount = st({ path: __dirname + '/frontend', url: '/frontend', passthrough: false, cache: false});

app.use(mount);

/*
	This is needed to read POST data
*/

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended: true}));

/*
	Express render method shorthand
*/
app.engine('html', swig.renderFile);
app.set('view engine', 'html');

/*
	These are the routes, they control what is sent to the user

	views:   handle requests that expect a HTML (fragment) response;
				     templates are located in /sites/
	scripts: handle requests that expect a JS script response;
				     scripts are located at /frontend/scripts/
	styles:  handle requests that expect a response containing CSS or
						 image data.
						 CSS is located at /frontend/css/,
						 raster images are located at /frontend/images/,
						 svg images are located at /frontend/svg/.
	api:     handles requests that expect a response containing JSON data.
*/
app.get('/',                            views.wrapper            );
app.get('/home',                        views.wrapper            );
app.get('/artist/:id',                  views.wrapper            );
app.get('/song/:id',                    views.wrapper            );
app.get('/charts',                      views.wrapper            );
app.get('/time-machine/:id',            views.wrapper            );
app.get('/u/:username/p/:playlist',     views.wrapper            );
app.get('/thread/:id',                  views.wrapper            );
app.get('/album/:id',                   views.wrapper            );
app.get('/info',                        views.wrapper            );
app.get('/sway', 						views.wrapper			 );
app.get('/track/:id',                   views.wrapper            );
app.get('/lyrics/:id',                  views.wrapper            );
app.get('/register',                    views.wrapper            );
app.get('/library',                     views.wrapper            );
app.get('/settings',                    views.wrapper            );
app.get('/genres',                      views.wrapper            );
app.get('/remote',                      views.wrapper            );
app.get('/youtube',                     views.wrapper            );
app.get('/import',                      views.wrapper            );
app.get('/radio',                       views.wrapper            );
app.get('/services',                    views.wrapper            );
app.get('/new-playlist',               	views.wrapper            );
app.get('/report/:id',                  views.wrapper            );
app.get('/select_username/:id',			views.wrapper			 );
app.get('/r/:subreddit', 				views.wrapper 			 );
app.get('/register',					views.wrapper 			 );
app.get('/u/:username', 				views.wrapper 			 );
app.get('/one',							views.wrapper			 );
app.get('/one/:one', 					views.wrapper 			 );
app.get('/one/submit',					views.wrapper			 );
app.get('/submit',						views.wrapper			 );
app.get('/one/:sub/submit',				views.wrapper			 );
app.get('/one/:sub/submit/:entity/:id',	views.wrapper			 );
app.get('/one/:sub/:slug/:title', 		views.wrapper 			 );
app.get('/songs', 						views.wrapper 			 );
app.get('/playlists', 					views.wrapper 			 );
app.get('/stories', 					views.wrapper 			 );
app.get('/one/:sub/songs', 				views.wrapper 			 );
app.get('/one/:sub/playlists', 			views.wrapper 			 );
app.get('/one/:sub/charts', 			views.wrapper 			 );
app.get('/one/:sub/stories', 			views.wrapper 			 );
app.get('/privacy', 					views.wrapper 			 );
app.get('/rmt',                         views.rmt                );
app.get('/mobile', 						views.mobile 			 );

/*
	Backend routes
*/
app.get('/api/styles/:filename',        styles.get               );
app.get('/api/artist/:id',              views.artist             );
app.get('/api/song/:id',                api.getSong              );
app.get('/api/lyrics/:id',              views.lyrics             );
app.get('/api/charts',                  views.charts             );
app.get('/api/charts/json', 			api.getCharts  		 	 );
app.get('/api/charts/:year',            views.retrocharts        );
app.get('/api/album/:id',               views.album              );
app.get('/api/i/:filename',             styles.images.get        );
app.get('/api/jpg/:filename',           styles.jpg.get        	 );
app.get('/api/svg/:filename',           styles.svg.get           );
app.get('/api/svg/:filename/:color',    styles.svg.getColor      );
app.get('/api/video/:filename/mp4', 	styles.video.mp4 		 );
app.get('/api/main',                    views.main               );
app.get('/api/error/:code',             views.error              );
app.get('/api/info',                    views.info               );
app.get('/api/u/:username', 			api.getUser				 );
app.get('/api/thread/:id',              views.redditpl           );
app.get('/api/remote',                  views.remote             );
app.get('/api/settings',                views.settings           );
app.get('/api/services',                views.services           );
app.get('/api/genres',                  views.reddit             );
app.get('/api/r/:subreddit', 			views.redditdetail 		 );
app.get('/api/report/:id',				views.report             );
app.get('/api/register', 				views.register		 	 );
app.get('/api/select_username/:name',	views.select_username	 );
app.get('/api/banner', 					views.banner 			 );
app.get('/api/banner2', 				views.banner2			 );
app.get('/api/cache', 					views.cache 			 );
app.get('/api/submit', 					views.submit 			 );
app.get('/api/one/:sub/submit/:entity/:id',views.submit 		 );
app.get('/api/community/post' ,			views.post 				 );
app.post('/api/community/submit',		api.submitPost 			 );
app.post('/api/community/delete', 		api.deletePost 			 );
app.get('/api/songs', 					views.sub_posts 		 );
app.get('/api/playlists',				views.sub_posts 		 );
app.get('/api/stories',					views.sub_posts 		 );
app.get('/api/:sub/playlists', 			views.sub_posts 		 );
app.get('/api/:sub/songs', 				views.sub_posts 		 );
app.get('/api/:sub/stories', 			views.sub_posts 		 );
app.get('/api/:sub/charts', 			views.genrecharts 		 );
app.get('/api/privacy', 				views.privacy 			 );
app.post('/api/add_tracks', 			api.addTracksToCollectionPost);
app.get('/api/add_tracks', 				api.addTracksToCollection);
app.get('/api/remove_tracks', 			api.removeTracksFromCollection);
app.get('/api/sync', 					api.sync 				 );
app.get('/api/one',						views.subs				 );
app.get('/api/one/:one',				api.getOne 				 );
app.post('/api/report', 				api.reportMetadata 		 );
app.get('/api/new-track', 				api.newTrack 			 );
app.get('/api/new-ytid', 				api.newYtid 			 );
app.get('/api/playlist-menu', 			api.getPlaylistMenu 	 );
app.get('/api/playlist-dialogue', 		api.addPlaylistDialogue  );
app.get('/api/pl-options',				api.getPlaylistOptions 	 );
app.get('/api/playlists/get', 			api.getPlaylist 		 );
app.get('/api/playlists/get-tracks', 	api.getPlaylistTracks	 );
app.get('/api/playlists/privacy', 		api.changePlaylistPrivacy);
app.get('/api/playlists/order', 		api.changePlaylistOrder  );
app.get('/api/playlists/reorder', 		api.reorderPlaylist 	 );
app.get('/api/playlists/rename', 		api.renamePlaylist 	     );
app.get('/api/playlists/delete', 		api.deletePlaylist 		 );
app.get('/api/playlists/create', 		api.addPlaylist 		 );
app.get('/api/playlists/follow',		api.followPlaylist 		 );
app.post('/api/playlists/style', 		api.updatePlaylistStyle	 );
app.get('/api/settings/update', 		api.updateSettings 		 );
app.get('/api/register/check-name',		api.checkUsername 		 );
app.get('/api/register/name-chosen', 	api.usernameChosen 		 );
app.get('/api/register/classic', 		api.register 			 );
app.post('/api/register/login', 		api.login 			 	 );
app.get('/api/tracks/get', 				api.getTracks 			 );
app.post('/api/tracks/get', 			api.getTracksPost 	     );
app.get('/api/charts/retro/:year', 		api.retroCharts 		 );
app.get('/api/user/get', 				api.getUserData 		 );
app.get('/api/album/:id/json', 			api.getAlbum 			 );
app.get('/api/artist/:id/json', 		api.getArtist 			 );
app.get('/api/languages/set',			api.changeLang 			 );
app.get('/api/youtube/:id/url', 		api.getYouTubeURL 		 );
app.get('/api/post/vote', 				api.changeVote			 );
app.get('/api/homepage', 				api.getHomepage 		 );
app.post('/api/comments/create',		api.submitComment 		 );
app.post('/api/comments/vote',			api.changeCommentVote 	 );
app.post('/api/comments/delete',		api.deleteComment  		 );
app.get('/api/youtube/best-video', 		api.findYouTubeId 		 );
app.get('/api/cover',					proxy.proxy				 );
app.get('/api/sway',					views.sway				 );

/*
	Auth routes
*/
app.get('/auth/facebook',               fb.login                 );
app.get('/auth/facebook/token',         fb.token                 );
app.get('/auth/facebook/access',        fb.access                );
app.get('/logout',                      fb.logout                );

/*
	Set up admin routes
*/
app.get('/admin',                        admin.home               );
app.get('/admin/redditbot/add',          admin.redditadd          );
app.get('/admin/redditbot/remove/:id',   admin.redditremove       );
app.get('/admin/reported',               admin.reported           );
app.get('/admin/reported/:id/accept',    admin.acceptReportRequest);
app.get('/admin/reported/:id/reject',    admin.rejectReport       );
app.get('/admin/subs', 					 admin.showSubs 		  );
app.get('/admin/subs/insertdefault', 	 admin.insertStandardSubs );
app.get('/admin/subs/:sub/moderator/add',admin.addModerator   	  );
app.get('/admin/stats', 				 admin.getStats 	   	  );
app.get('/admin/playlists', 			 admin.getPlaylists 	  );
app.post('/admin/playlists/create', 	 admin.createPlaylist 	  );
app.get('/webhook/push',                 webhook.push             );

/*
	Cache manifest
*/
app.get('/onetune.manifest', 			manifest.sendManifest	  );

var lastfm_integration = new lastfm.LastFm({
	api_key:  process.env.LASTFM_API_KEY,
	secret: process.env.LASTFM_API_SECRET,
	saveToken: views.saveLastfm,
	getToken: views.getLastfm
});

app.use('/lastfm', 						lastfm_integration.router );

/*
	Fetch iTunes feeds every hour
*/
charts.refresh();
charts.getAllGenres();

/*
	Start reddit bot
*/
reddit.startBot();

/*
	Start embed server
*/
embed.initialize(app);

/*
	If the server crashes,
*/
process.on('SIGTERM', function () {
	server.close();
});
