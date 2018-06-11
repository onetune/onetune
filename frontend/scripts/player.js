player = {};
player.playSong = function(song, noautoplay, nohistory) {
	if (!noautoplay && player.nowPlaying.get() && song.id + '' == player.nowPlaying.get().id + '' && ytplayer && ytplayer.seekTo) {
		ytplayer.seekTo(0);
		return;
	}
	var songobj = helpers.parseDOM(song);
	if ($(song).hasClass("recognized") || songobj.ytid != undefined) {
		/*
			If user has YTID replacements, f.e. when living in Germany these are generated
		*/
		songobj = videoIdReplacements(songobj);
		/*
			Send YTID to YouTube player
		*/
		if (noautoplay) {
			ytplayer.cueVideoById(songobj.ytid);
		}
		else {
			if (ytplayer.loadVideoById) {
				setTimeout(function() {
					ytplayer.loadVideoById(songobj.ytid);
				}, 80);
			}
			else {
				if (!ytplayer.d || !ytplayer.d.contentWindow) {
					youtubeinit();
				}
				setTimeout(function() {
					player.playSong(song, noautoplay, nohistory);
				}, 80);

			}
			$('#seek-bar').addClass('buffering');
			$('#seek-progress').css('width', 0);
		}
		/*
			Add old song to history
		*/
 		player.nowPlaying.replace(songobj, nohistory);
 		/*
			Display speaker icon
 		*/
 		displaySpeaker()
	}
	else {
		recognition.findVideo(songobj, function (video) {
			if (video) {
				songobj.ytid = video.basic.id.videoId;
				player.playSong(songobj);
			}
		});
	}
}
displaySpeaker = function() {
	 $('.queue-now-playing').removeClass('queue-now-playing');
	 if (player && player.queues && player.queues.current) {
		$('[data-navigate="' + player.queues.current.represents + '"]').addClass('queue-now-playing');
	 	$('.play-list[data-id="' + player.queues.current.represents + '"]').addClass('queue-now-playing');
	 }
}
updateHints = function() {
	var next = player.queues.current.predictNext();
	var prev = player.queues.current.predictPrev();
	nextlabel = (next != undefined) ? "<strong>" + next.name + "</strong><br>" + next.artist : "Go to start of this song",
	prevlabel = (prev != undefined) ? "<strong>" + prev.name + "</strong><br>" + prev.artist : "Go to start of this song";
	$(".next-update").html(nextlabel);
	$(".prev-update").html(prevlabel);
	$("#skip").attr("data-tooltip", "<div class='next-update'>" + nextlabel + "</div>");
	$("#rewind").attr("data-tooltip", "<div class='prev-update'>" + prevlabel + "</div>");
}
player.scrobbleTimeout = null;
player.nowPlaying = {
	replace: function(song, nohistory) {
		var oldsong = player.nowPlaying.get();
		var song = helpers.parseDOM(song);
		localStorage['nowPlaying'] = JSON.stringify(song);
		oneTune.nowPlaying(song);
		var is_in_library = false;
		if (chinchilla.loggedin) {
			if (_.contains(oneTune.library(), song.id + '')) { is_in_library = true; }
			$("#nowplaying-heart-container").attr('class', is_in_library ? 'in-library' : 'not-in-library')
			$('#nowplaying-heart').attr('data-id', song.id + '');
		}
		$("#track-title a").text(song.name).attr('data-navigate', '/song/' + song.id + '');
		$("#track-artist a").text(song.artist).attr('data-navigate', '/artist/' + song.artistid);
		$("#track-album a").text(song.album == 'null' ? '' : song.album).attr('data-navigate', '/album/' + song.albumid);
		$('title').text(song.name + ' - ' + song.artist);

		var cover = helpers.getHQAlbumImage(song, 225);
		/*
			Do scrobble after 30 seconds
		*/
		if (localStorage.scrobble == 'true') {
			if (player.scrobbleTimeout) { clearTimeout(player.scrobbleTimeout) }
			player.scrobbleTimeout = setTimeout(function () {
				$.ajax({
					url: '/lastfm/scrobble',
					data: {
						track: song.name,
						artist: song.artist
					},
					type: 'POST',
					success: function(json) {
						console.log('Tried to scrobble. Success:', json.success)
					}
				})
			}, 30000);
		}
		/*
			If the user wants to, set the album cover as favicon
		*/
		if (chinchilla.settings.favicon_album || !chinchilla.settings) {
			$('#favicon').attr('href', song.image);
		}
		var npimage1 = $("#nowplaying-image"), npimage2 = $("#nowplaying-image2"), cover = helpers.getHQAlbumImage(song, 225);
		if (!($('#player-controls').css('opacity') == 1)) {
			player.show();
		}
		if ((oldsong && oldsong.image != song.image) || (npimage1.attr('src') == '' && npimage1.attr('src') == '')) {
			if (npimage1.hasClass('np-placeholder-used')) {
				npimage1.removeClass('np-placeholder-used')
				if (npimage2.attr('src') == cover) {
					playerimgload2();
				}
				else {
					npimage2.attr('src', cover).addClass('np-placeholder-used')
				}
			}
			else {
				npimage2.removeClass('np-placeholder-used')
				if (npimage1.attr('src') == cover) {
					playerimgload1();
				}
				else {
					npimage1.attr('src', cover).addClass('np-placeholder-used')
				}
			}
		}
		var one_wrapper = $('.one-track-wrapper[data-represents="' + player.queues.current.represents + '"]').find('.one-track-wrapper-cover')
		one_wrapper.attr('src', helpers.getHQAlbumImage(song, $(one_wrapper).attr('data-px')))
		$('.song').removeClass('now-playing hearable')
		oneTune.hearable(false);
		$(".song[data-id='" + song.id + "']").addClass('now-playing');
		updateHints();
		remote.updateTrack();
	},
	get: function(song) {
		helpers.localStorageSafety('nowPlaying');
		return (localStorage['nowPlaying'] == '[]') ? null :  JSON.parse(localStorage['nowPlaying']);
	}
}
var Queue = function(name, represents) {
	this.current = null;
	this.queue = [];
	this.represents = represents;
	this.name = name;
	this.history = [];
	this.add = function(song, first) {
		var song = helpers.parseDOM(song)
		this.queue[first ? 'unshift': 'push'](song);
		player.saveQueQue();
		return this.queue;
	}
	this.setCurrent = function(current) {
		this.current = helpers.parseDOM(current);
		player.saveQueQue();
	}
	this.clearQueue = function() {
		this.queue = [];
		return this.queue;
	}
	this.clearHistory = function() {
		this.history = [];
		return this.history;
	}
	this.nextTrack = function() {
		/*
			This only gets called when the user has added
			tracks using the "Add to Queue" button

			Otherwise, it skips this.
		*/
		if (player.queues.primaryQueue.length != 0) {
			var i = player.queues.primaryQueue.splice(0,1)[0];
			$.publish('queue-changed');
			return i;
		}
		/*
			If there is no track in the queue:
			* and no track in the history, it plays the same song again
			* a track in the history, it plays the earliest track from the history.
		*/
		if (this.queue.length == 0) {
			if (this.history.length == 0) return this.current;
			var element = this.history.shift();
		}
		/*
			If there is at least track in the queue, it gets the first one in the queu
		*/
		else {
			var element = this.queue.shift();
		}
		if (this.current) {
			// Put the current track to the history
			this.history.push(this.current);
		}
		player.saveQueQue();
		// Take first element of queue and put it as current track
		this.current = element;
		$.publish('queue-changed')
		return element;
	}
	this.nthTrack = function(n) {
		if (player.queues.primaryQueue.length != 0) {
			if (n > player.queues.primaryQueue.length) {
				n = n - player.queues.primaryQueue.length;
			}
			else {
				var i = player.queues.primaryQueue.splice(n-1,1)[0];
				$.publish('queue-changed');
				return i;
			}
		}
		if (this.queue.length == 0) {
			if (this.history.length == 0) return this.current;
			var historylength = this.history.length;
			var elements = this.history.splice(0, n);

			var n_remaining = n - historylength;
			if (n_remaining > 0) {
				elements = elements.concat(this.queue.splice(0, n_remaining));
			}
		}
		else {
			var queuelength = this.queue.length;
			var elements = this.queue.splice(0, n);

			var n_remaining = n - queuelength;
			if (n_remaining) {
				elements = elements.concat(this.history.splice(0, n_remaining))
			}
		}

		var to_play = elements.pop();
		console.log(elements, this.current);
		if (this.current) {
			this.history.push(this.current);
			this.history = this.history.concat(elements);
		}
		player.saveQueQue();
		this.current = to_play;
		$.publish('queue-changed');
		return to_play;
	}
 	this.previousTrack = function() {
		if (this.history.length == 0) {
			if (this.queue.length == 0) return this.current;
			var element = this.queue.pop();
		}
		else {
			var element = this.history.pop();
		}
		if (this.current) {
			// Put the current track as the first element of the queue
			this.queue.unshift(this.current);
		}
		player.saveQueQue();
		//Take the last element of the history and put it as current
		this.current = element;
		$.publish('queue-changed')
		return element;
	}
	this.predictNext = function() {
		if (player.queues.primaryQueue.length != 0) {
			return player.queues.primaryQueue[0];
		}
		if (this.queue.length == 0) {
			if (this.history.length == 0) return this.current;
			return this.history[0];
		}
		return this.queue[0];
	}
	this.predictPrev = function() {
		if (this.history.length == 0) {
			if (this.queue.length == 0) return this.current;
			return _.last(this.queue);
		}
		return _.last(this.history);
	}
}
var QueQue = function() {
	this.current = null;
	this.next = [];
	this.prev = [];
	this.primaryQueue = [];
	this.nextQueue = function() {
		if (this.next.length == 0) return;
		if (this.current) {
			this.prev.push(this.current);
		}
		this.current = this.next.shift();
		player.saveQueQue();
		player.playQueue();
		$.publish('queue-changed')
	}
	this.prevQueue = function() {
		if (this.prev.length == 0) return;
		this.next.unshift(this.current);
		this.current = this.prev.pop();
		player.saveQueQue();
		player.playQueue();
		$.publish('queue-changed')
	}
	this.newQueue = function(queue) {
		if (this.current) {
			if (this.current.represents == queue.represents) {
				this.current = queue;
				$.publish('queue-changed');
				return;
			}
			this.prev.push(this.current);
		}
		_.each(this.next, (function (a) { this.prev.push(a) }).bind(this));
		this.current = queue;
		var reject = function (a) { return a.represents == queue.represents }
		this.prev = _.last(_.reject(this.prev, reject), 15);
		this.next = _.first(_.reject(this.next, reject), 15);
		$.publish('queue-changed');
	}
	this.hasPrevious = function() {
		return this.prev.length != 0;
	}
	this.hasNext = function() {
		return this.next.length != 0;
	}
}
var convertToNormalQueue = function(queue) {
	if (!queue) return null;
	var new_queue = new Queue(queue.name, queue.represents);
	new_queue.current = queue.current;
	new_queue.history = queue.history;
	new_queue.queue = queue.queue;
	return new_queue;
}
var convertToNormalQueQue = function(queque) {
	var newqueque = new QueQue();
	newqueque.current = queque.current;
	newqueque.next = queque.next;
	newqueque.prev = queque.prev;
	return newqueque;
}
player.saveQueQue = function() {
	localStorage.queues = JSON.stringify(player.queues);
}
player.backUpQueue = function() {
	if (localStorage.queues) {
		player.queues = JSON.parse(localStorage.queues);
		player.queues = convertToNormalQueQue(player.queues);
		player.queues.current = convertToNormalQueue(player.queues.current);
		player.queues.next = _.map(player.queues.next, function (a) { return convertToNormalQueue(a); });
		player.queues.prev = _.map(player.queues.prev, function (a) { return convertToNormalQueue(a); });
	}
}
player.queues = new QueQue();
player.backUpQueue();
player.automaticseekblocked = false;
var stateChange = function(state) {
	/*
		var states = {0: ended, 1: playing, 2: paused, 3: buffering, 5: video cued}
	*/
	if (state.data == 1) {
		$("#play").hide();
		$("#pause").show();
		$('#seek-bar').removeClass('buffering');
		$('.now-playing').addClass('hearable');
		oneTune.hearable(true);
	}
	else {
		if (state.data == 0) {
			player.playNext()
		}
		if (state.data == 2) {
			$('.now-playing').removeClass('hearable')
			oneTune.hearable(false);
		}
		$("#pause").hide();
		$("#play").show();

	}
}
var videoEnded = function() {
	player.playNext();
}
var videoIdReplacements = function(song) {
	helpers.localStorageSafetyObject('videoIdReplacements');
	var replacements 	= helpers.getLocalStorage('videoIdReplacements');
	var replacementid 	= replacements[song.ytid];
	if (replacementid 	!= undefined) {
		song.ytid = replacementid;
	}
	return song;

}
var replaceVideo = function(videoid, replacement) {
	helpers.localStorageSafety('videoIdReplacements');
	var replacements 					= JSON.parse(localStorage['videoIdReplacements']);
	replacements[videoid] 				= replacement;
	localStorage['videoIdReplacements'] = JSON.stringify(replacements);
}
var errorOccured = function(error_code) {
	if (error_code == 0) {
		notifications.create('The video could not be loaded due to some country restrictions. Looking for an alternative...');
	}
	else {
		notifications.create('A unknown error happened while trying to play the video. Looking for an altenative...')
	}
	/*
		Find an alternative video
	*/
	helpers.localStorageSafety('banned_videos');
	var banned_videos = JSON.parse(localStorage.banned_videos);
	banned_videos.push((player.nowPlaying.get()).ytid);
	localStorage.banned_videos = JSON.stringify(banned_videos)
	var song = player.nowPlaying.get()
	recognition.findVideo(song, function(video) {
		if (video != undefined) {
			var oldid = song.ytid,
				newid = video.basic.id.videoId;
			song.ytid = newid;
			replaceVideo(oldid, newid);
			ytplayer.loadVideoById(song.ytid)
			notifications.create('Original video not available in your country. Alternative was found.');
		}
		else {
			notifications.create('No video available in your country was found. We cannot play this song, sorry.');
		}
	}, undefined, undefined, undefined, ['restricted']);
}
player.show = function() {
	$('#player-controls').animate({'opacity': 1}, 100);
	$('[data-navigate="/youtube"]').show();
	$('#nowplaying-speaker-icon').show();
}
player.setUpEvents = function() {
	/*
		Update time label
	*/
	var timeUpdate = function() {
			var current   		= ytplayer.getCurrentTime(),
				duration  		= ytplayer.getDuration(),
				parsedcurrent 	= helpers.parsetime(current),
				parsedduration	= helpers.parsetime(duration);
			document.getElementById('time-right').innerHTML = parsedduration == 'NaN:NaN' ? '0:00' : parsedduration;
			document.getElementById('time-left').innerHTML = parsedcurrent == 'NaN:NaN' ? '0:00' : parsedcurrent;
			var percent = (current/duration)*100;
			var val;
			if (!player.automaticseekblocked && percent) {
				var val = percent
			}
			if (percent == "NaN") {
				var val = 0
			}
			document.getElementById('seek-progress').style.width = val + '%'
		setTimeout(timeUpdate, 500)
	}
	timeUpdate()
}
player.playQueue	= function() {
	player.playSong(player.queues.current.current);
	player.saveQueQue();
}
player.pause		= function() {
	if (!ytplayer) return;
	if (!ytplayer.pauseVideo) return;
	ytplayer.pauseVideo();
}
player.play 		= function() {
	ytplayer.playVideo();
}
player.seek 		= function(to) {
	ytplayer.seekTo(to);
}
player.playNext 	= function() {
	player.playSong(player.queues.current.nextTrack());
}
player.skipNTracks 	= function(n) {
	player.playSong(player.queues.current.nthTrack(n));
}
player.playLast		= function() {
	player.playSong(player.queues.current.previousTrack());
}
player.togglePlayState 	= function() {
	var state = ytplayer.getPlayerState();
	if (state == 1) {
		player.pause();
	}
	else {
		player.play();
	}
}
