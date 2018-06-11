/*
	Load dependencies.
	-FS is used for template fetching.
	-DB loads the database
	-FB manages users
	-Swig is a template engine
*/
var fs 				= require('fs'),
	db 				= require('../db/queries'),
	fb 				= require('../config/facebook'),
	itunes 			= require('../config/itunes'),
	swig 			= require('swig'),
	_ 				= require('underscore'),
	helpers 		= require('../frontend/scripts/helpers').helpers,
	remote 			= require('../config/remote'),
	radio 			= require('../config/radio'),
	yturl 			= require('get-youtube-id'),
	jsonreq 		= require('jsonreq'),
	validator		= require('validator'),
	password_hash  	= require('password-hash');
/*
	Specifies the parent directory path in a string.
*/
var dirup = __dirname.substr(0, __dirname.length - 7);
var notificationtemplates = {
	track_added: 	swig.compileFile(dirup + '/sites/notifications/track-added.html'),
	track_removed: 	swig.compileFile(dirup + '/sites/notifications/track-removed.html'),
	tracks_added: 	swig.compileFile(dirup + '/sites/notifications/tracks-added.html'),
	tracks_removed: swig.compileFile(dirup + '/sites/notifications/tracks-removed.html')
}
var menutemplates 		  = {
	playlist: 		swig.compileFile(dirup + '/sites/playlistmenuitem.html'),
	playlistdialog: swig.compileFile(dirup + '/sites/add-playlist-dialog.html')
}
var musictemplates 		  = {
	track: 			swig.compileFile(dirup + '/sites/song.html')
}
this.connection = function (socket) {
		socket.emit('connected', {"message": "You are now connected to the socket.io server."});
		/*
			Remote API's
		*/
		socket.on('/pairing/register', 				function (data) {
			remote.pairingconnections.push({
				code: data.code,
				desktop: socket
			});
			socket.emit('/pairing/registered', { code: data.code });
			socket.once('disconnect', function() {
				var pairing = remote.getPairing(data.code);
				if (pairing && pairing.mobile) {
					pairing.mobile.emit('/pairing/other-device-disconnected');
					remote.removePairing(data.code);
				}
			});
		});
		socket.on('/pairing/add-device', function (data) {
			var pairing = remote.getPairing(data.code)
			if (pairing) {
				pairing.mobile = socket;
				remote.updatePairing(pairing, data.code);
				socket.emit('/pairing/device-added', {message: 'Your device is now paired.' });
				socket.once('disconnect', function() {
					if (pairing && pairing.desktop) {
						pairing.desktop.emit('/pairing/other-device-disconnected');
						remote.removePairing(data.code);
					}
				});
			}
			else {
				socket.emit('/pairing/device-failed', {message: 'The code is wrong.'});
			}
		});
		socket.on('/pairing/remote/action', function (data) {
			var pairing = remote.getPairing(data.code)
			if (pairing && pairing.desktop) {
				pairing.desktop.emit('/pairing/receive-action', { action: data.action });
			}
		});
		socket.on('/pairing/update-info', function (data) {
			var pairing = remote.getPairing(data.code);
			if (pairing && pairing.mobile) {
				pairing.mobile.emit('/pairing/push-info', data);
			}
		});

		/*
			Radio sockets
		*/
		socket.on('/radio/start-radio/track', function (data) {
			radio.get_echonest_song(data.id, function (echonest_song) {
				radio.start_radio_from_song(echonest_song, function (data) {
					socket.emit('/radio/radio-started', data);
				});
			});
		});
		socket.on('/radio/get-next-tracks', function (data) {
			radio.get_next_tracks(data.radio_id, socket, function() {
				socket.emit('/radio/next-tracks-sent');
			})
		})
		socket.on('/radio/track-played', function (data) {
			radio.send_dummy_request(data.radio_id);
		})
};