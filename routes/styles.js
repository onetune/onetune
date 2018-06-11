/*
	Require the Swig module for templating.
*/
var swig   	= require('swig'),
	_      	= require('underscore'),
	dbquery = require('../db/queries'),
	fs 		= require('fs');

_.str = require('underscore.string')
_.mixin(_.str.exports());
_.str.include('Underscore.string', 'string');
/*
	This is the current directory without the "/routes" at the end, so basically the parent directory
*/
var dirup = __dirname.substr(0, __dirname.length - 7);

this.get = function (request, response) {
	response.setHeader("Content-Type", "text/css");
	response.sendfile(dirup + "/frontend/css/" + request.params.filename + ".css");
}
this.images = {
	get: function(request, response) {
		response.setHeader("Content-Type", "image/png");
		response.setHeader("Cache-Control", "public, max-age=345600");
		response.sendfile(dirup + "/frontend/images/" + request.params.filename + ".png");
	}
}
this.jpg = {
	get: function(request, response) {
		response.setHeader("Content-Type", "image/jpeg");
		response.setHeader("Cache-Control", "public, max-age=345600");
		response.sendfile(dirup + "/frontend/images/" + request.params.filename + ".jpg");
	}
}
this.video = {
	mp4: function(request, response) {
		response.setHeader("Content-Type", "video/mp4");
		response.sendfile(dirup + "/frontend/videos/" + request.params.filename + ".mp4");
	}
}
this.svg = {
	get: function(request, response) {
		response.setHeader("Content-Type", "image/svg+xml");
		var filename = request.params.filename;
		response.sendfile(dirup + "/frontend/svg/" + filename + ".svg");
	},
	getColor: function(request, response) {
		var filename 	= request.params.filename,
			color 		= request.params.color,
			allowed 	= ['white', 'blue', 'black', 'gray'];
		if (!_.contains(allowed, color)) { response.end('not allowed!'); return;};
		var colors 		= {
			white: '#FFFFFF',
			blue: '#f84a4a',
			black: '#000',
			gray: '#f0f0f0'
		}
		var color 		= colors[color];
		response.setHeader("Content-Type", "image/svg+xml");
		if (filename == 'heart') {filename = 'heart-white'}
		fs.readFile(dirup + "/frontend/svg/" + filename + ".svg", 'utf8', function(err, data) {
			if (!err) {
				if (filename == 'heart-white') {
					response.end(data);
				}
				else {
					var data = data.replace(/fill="black"/, '');
					var data = data.replace(/fill="#000000"/, '');
					var data = data.replace(/fill:#010101/, '')
					var data = data.replace(/fill="none"/g,	'');
					var data = data.replace(/fill="red"/g, '');
					var data = data.replace(/flood-color='red'/, "flood-color='black'");
					var data = data.replace(/<polygon/g, 	'<polygon fill="' + color + '"');
					var data = data.replace(/<path/g,		'<path fill="' + color + '"');
					var data = data.replace(/<ellipse/g,	'<ellipse fill="' + color + '"');
					var data = data.replace(/<circle/g, 		'<circle fill="' + color + '"');
					response.end(data);
				}

			}
			else {
				response.end('File doesn\'t exist.')
			}
		})
	}
}