var gulp = require('gulp'),
	less = require('gulp-less'),
	livereload = require('gulp-livereload'),
	spawn = require('child_process').spawn,
	concat = require('gulp-concat'),
	uglify = require('gulp-uglify'),
	rename = require('gulp-rename'),
	runSequence = require('run-sequence'),
	node;

var less_files = 'frontend/styles/*.less';
var main_less_file = 'frontend/styles/main.less';
var embed_less_file = 'embed/less/embed.less';
gulp.task('embed', function() {
	gulp.watch(embed_less_file, function () {
		gulp.start('embed-less');
	});
	gulp.start('server');
});
gulp.task('default', function () {
	/*
		Watch LESS changes and convert to CSS
	*/
	gulp.watch(less_files, function() {
		gulp.start('less')
	});

	/*
		When CSS changed, reload browser
		Enable LiveReload on your computer!
	*/
	gulp.watch('./frontend/css/main.css').on('change', livereload.changed)

	/*
		Restart server when app.js or other backend files were changed
	*/
	gulp.start('server');
	gulp.watch(['app.js', 'newrelic.js', 'config.json', 'admin/*', 'config/*', 'db/*', 'routes/*'], function () {
		console.log('Backend file changed.');
		gulp.start('server');
	});

	/*
		Uglify
	*/
	gulp.watch(['frontend/scripts/*', '!frontend/scripts/app.js', '!frontend/scripts/app.min.js'])
	.on('change', function (a) {
		console.log('Frontend file changed.')
		runSequence('concat-js', function() {
			setTimeout(function () {
				livereload.changed(a);
				gulp.start('uglify');
			}, 100);
		});
	});

	/*
		Reload when HTML changed
	*/
	gulp.watch('sites/*').on('change', function(a) {
		livereload.changed(a)
	})
	livereload.listen();
});
/*
	Runs a node server
*/
gulp.task('server', function() {
	var wasserver;
	if (node) {
		wasserver = true;
		node.kill();
	};
	node = spawn('node', ['app.js'], {stdio: 'inherit'});
	if (wasserver) {
		console.log('Server restarted.');
	}
	node.on('close', function (code) {
		if (code === 8) {
			console.log('Error detected, waiting for changes...');
		}
	});
});

/*
	Merges all JS files
*/
gulp.task('concat-js', function() {
	var js_files = [
		'frontend/scripts/translations.js',
        'frontend/scripts/idbpolyfill.js',
        'frontend/scripts/idbstore.js',
        'frontend/scripts/underscore.js',
        'frontend/scripts/browser.js',
        'frontend/scripts/helpers.js',
        'frontend/scripts/underscore.js',
        'frontend/scripts/helpers.js',
        'frontend/scripts/fetchFeeds.js',
        'frontend/scripts/navigation.js',
        'frontend/scripts/notifications.js',
        'frontend/scripts/sockets.js',
        'frontend/scripts/templates.js',
        'frontend/scripts/player.js',
        'frontend/scripts/search.js',
        'frontend/scripts/add-tracks.js',
        'frontend/scripts/import.js',
        'frontend/scripts/errors.js',
        'frontend/scripts/recognition.js',
        'frontend/scripts/swfobject.js',
        'frontend/scripts/libdom.js',
        'frontend/scripts/library.js',
        'frontend/scripts/UI.js',
        'frontend/scripts/pubsub.js',
        'frontend/scripts/local.js',
        'frontend/scripts/remote.js',
        'frontend/scripts/queues.js',
        'frontend/scripts/radio-client.js',
        'frontend/scripts/report.js',
        'frontend/scripts/sync.js',
        'frontend/scripts/tracklist.js',
        'frontend/scripts/one.js',
        'frontend/scripts/songpicker.js',
        'frontend/scripts/userpage.js',
        'frontend/scripts/submit.js',
        'frontend/scripts/homepage.js',
        'frontend/scripts/itunes-colors.js',
        'frontend/scripts/colors.js',
        'frontend/scripts/homeView.js'
    ];

	gulp.src(js_files)
	.pipe(concat('app.js', {newLine: ';'}))
	.pipe(gulp.dest('frontend/scripts'))
});

/*
	Make Javascript file smaller and save to app.min.js
*/
gulp.task('uglify', function () {
	gulp.src('frontend/scripts/app.js')
	.pipe(uglify())
	.pipe(rename('app.min.js'))
	.pipe(gulp.dest('frontend/scripts'))
});

/*
	Convert LESS to CSS
*/
gulp.task('less', function () {
	gulp.src(main_less_file)
	.pipe(less())
	.pipe(gulp.dest('./frontend/css'));
});

gulp.task('embed-less', function () {
	gulp.src(embed_less_file)
	.pipe(less())
	.pipe(gulp.dest('./embed/css'));
});


var messages = [
	'%s is now rocking this computer! Have fun.',
	'%s started.'
]

console.log(messages[Math.floor(Math.random()*messages.length)], '\u001b[33mone\u001b[1mtune\u001b[22m\u001b[39m');
process.on('exit', function() {
	if (node) node.kill();
});
