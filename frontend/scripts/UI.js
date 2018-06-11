var select      = function(e)   {
	/*
		Send to other function if batch selecting.
		Ctrl key selects all elements between already selected ones and the clicked.
	*/
	if (e.shiftKey) {
		shiftSelect(this);
		return;
	}
	/*
		Send to another function if CMD key is pressed.
		CMD key selects/deselects single elements without changing selection
	*/
	if (e.ctrlKey || e.metaKey) {
		cmdSelect(this);
		return;
	}
	/*
		If user just wants to fav songs, don't select
	*/
	var srcElement = e.srcElement || e.target;
	if ($(srcElement).hasClass('heart') || $(srcElement).data('navigate') != undefined) {
		return;
	}
	/*
		If the track is already selected, make drag&drop possible
	*/
	if ($(this).hasClass('selected') && (e.button == 0 || document.getElementsByClassName('selected').length < 2)) {
		var tounselect = $(".song.selected").not(this)
		var toselect   = $(this)
		$(document).one('mouseup', function () {
			toselect.addClass("selected");
			$(tounselect).removeClass("selected");
		});
		dragsongs(e);
		return;
	}
	/*
		Deselect all the other songs.
	*/
	if (e.button == 0 || document.getElementsByClassName('selected').length < 2) {
		var tounselect = $(".song.selected").not(this);
		$(this).addClass("selected");
		$(tounselect).removeClass("selected");
		dragsongs(e);
	}

};
var dragsongs = function(e) {
	var original = {
			x: e.clientX,
			y: e.clientY
		},
		todrag = _.map($('.selected'), function(dom) {return $(dom).data()}),
		droppableplaces = $('.playlistmenuitem, .librarymenuitem, .playlist-editable tr.song');
	if (todrag.length == 1) {
		$('#draglabel').text(todrag[0].name + ' - ' + todrag[0].artist)
	}
	else {
		$('#draglabel').text(todrag.length + ' tracks');
	}
	document.body.style.cursor = 'default'
	$(document).on('mousemove', function (e) {
		var difference = Math.sqrt(Math.pow(Math.abs(e.clientX-original.x), 2) + Math.pow(Math.abs(e.clientY-original.y), 2));
		if (difference > 20) {
			$('#draglabel').css({top: e.clientY - 30, left: e.clientX+10}).show();
		}
	});
	droppableplaces.on('mouseenter', function () {
		if ($(this).is('.selected')) {
			return;
		}
		$(this).addClass('droppableindicator');
		if ($(this).is('tr.song')) {
			var songs = $('tr.song');
			var index_of_original = songs.index($('.selected')[0]);
			var index_of_this = songs.index(this);
			if (index_of_original < index_of_this) {
				$(this).addClass('droppable-bottom');
			}
		}
		$(this).one('mouseleave', function () {
			$(this).removeClass('droppableindicator droppable-bottom');
		});
	});;
	droppableplaces.one('mouseup', function () {
		var atbottom = $(this).is('.droppable-bottom');
		$(this).removeClass('droppableindicator droppable-bottom');
		if ($(this).is('.song')) {
			if ($(this).is('.selected')) {
				return;
			}
			$('.selected')[atbottom ? 'insertAfter' : 'insertBefore'](this);
			var new_order = _.map($('.playlist-editable tr.song'), function (song) { return $(song).data('id') });
			playlist.reorder($(this).parents('[data-represents]').attr('data-represents'), new_order);
			return;
		}
		var target = $(this).attr('data-navigate');
			var socketdata = {
				token: chinchilla.token,
				tracks: _.pluck(todrag, 'id'),
				destination: (target == '/library' ? 'library' : target),
				type: (target == '/library' ? 'library' : 'playlist')
			}
			$.ajax({
				url: '/api/add_tracks',
				dataType: 'json',
				data: socketdata,
				success: library.ajaxResponse
			});

	});
	$(document).one('mouseup', function (e) {
		$(document).off('mousemove');
		$('#draglabel').hide()
		droppableplaces.off('mouseenter mouseup')
	})
}
window.playSong = function(e)    {
		$.publish('radio-disabled');
		/*
			If user just dblclicked on the heart, don't play the song.
		*/
		if ($(e.srcElement || e.target).hasClass('heart')) {
			return
		}
		convertDOMToQueue(this);
};
var convertDOMToQueue 	= function(elem, random, rep_up_2) {
	/*
		Get all next songs
		Add them to the queue.
		Also add the previous songs in reverse order so it loops
	*/
	var rep = $(elem).parents('[data-represents]');
	if (rep_up_2 && rep.parents('[data-represents]').length > 0) {
		rep = rep.parents('[data-represents]');
	}
	var represents = rep.data('represents');
	var repselector = "[data-represents='" + represents + "'] .song"
	var previousSongs = $(repselector).slice(0, $(repselector).index(elem));
	var nextSongs = $(repselector).slice($(repselector).index(elem)+1);
	if (random) {
		previousSongs = Array.prototype.slice.call(previousSongs);
		nextSongs = Array.prototype.slice.call(nextSongs);
		nextSongs = nextSongs.concat(previousSongs);
		nextSongs = _.shuffle(nextSongs);
		previousSongs = [];
	}
	var rep_label = represents_label(elem, represents)
	var newqueue = new Queue(rep_label, represents);
	newqueue.setCurrent(elem);
	newqueue.queue = _.map(nextSongs, helpers.parseDOM);
	newqueue.queue = newqueue.queue.concat(_.map(previousSongs, helpers.parseDOM));
	player.queues.newQueue(newqueue);
	player.playQueue();
}
var represents_label = function(dom, represents) {
	if (!represents) return '/'
	if (represents == '/library') return 'Library';
	if (represents == '/charts') return 'Charts';
	if (represents == '/genres') return 'Reddit';

	var song = helpers.parseDOM(dom);

	if (represents.substr(0,8) == '/artist/') return song.artist;
	if (represents.substr(0,7) == '/album/') return song.album;
	if (represents.substr(0,6) == '/song/') return song.name;
	if (represents.substr(0,14) == '/time-machine/') return 'Time machine to ' + represents.substr(14)
	if (represents.substr(0,3) == '/r/') return 'Reddit: ' + represents.substr(3);
	if (represents.substr(0,5) == '/one/') return represents.substr(5);
	if (_s.contains(represents, '/u/') && _s.contains(represents, '/p/')) {
		return _.filter(oneTune.playlists(), function (a) {return a.url == represents })[0].name;
	}
}
var shiftSelect         = function(obj) {
	var song         = $(obj),
		closestprev  = song.prevAll(".selected")[0],
		closestnext  = song.nextAll(".selected")[0];
	if (closestprev !== undefined) {
		song.prevUntil(closestprev, ".song").andSelf().addClass("selected");
	}
	if (closestnext !== undefined) {
		song.nextUntil(closestnext, ".song").andSelf().addClass("selected");
	}
};
var cmdSelect           = function(obj) {
	$(obj).toggleClass("selected");
};
var dragSeek			= function(obj) {
	var width = 224
	player.automaticseekblocked = true;
	var mousemove = function (e) {
		var position = e.pageX - $(document).width() + 225;
		$('#seek-progress').css('width', (position/width)*100 + "%");
	}
	$(document).on('mousemove', mousemove);
	$(document).one('mouseup', function (e) {
		$(document).off('mousemove');
		var position = e.pageX - $(document).width() + 225;
		if (position > 224) {
			var position = 224
		}
		player.seek((position/width)*ytplayer.getDuration());
		player.automaticseekblocked = false;
	});
};
var resume				= function(obj) {
	player.play();
};
var pause               = function(obj) {
	player.pause();
};

var skip                = function() {
	if ($(this).hasClass('radio-skip')) {
		$.publish('radio-enabled');
	}
	if (chinchilla.radio_mode) {
		var radiolist = JSON.parse(localStorage.radio)
		var station 	= radiolist[localStorage.current_radio];
		if (station.queue.length == 0 && !$('.album-slider').hasClass('load-tracks')) {
			//socket.emit('/radio/get-next-tracks', {radio_id: station.radio_id});
			$('.album-slider').addClass('load-tracks')
			chinchilla.play_next_radio_track_instantly = true;;
			return;
		}
		var currenttrack = station.current;
		var tracktoplay = station.queue.shift();
		station.current = tracktoplay;
		station.history.push(currenttrack);
		station.history = _.last(station.history, 5);
		radiolist[localStorage.current_radio] = station;
		if (currenttrack) {
			localStorage.radio = JSON.stringify(radiolist);
		}
		else return;
		radio.addBox(station.current);
		player.playSong(tracktoplay);
		//socket.emit('/radio/track-played', {radio_id: localStorage.current_radio});
		if (station.queue.length == 0 && !$('.album-slider').hasClass('load-tracks')) {
			//socket.emit('/radio/get-next-tracks', {radio_id: station.radio_id})
			$('.album-slider').addClass('load-tracks')
		}
		var radioboxes = $('.radio-album-covers .radio-box')
		if (radioboxes.size() > 5) {
			radioboxes.last().remove();
		}
	}
	else {
		player.playNext();
	}
};
var rewind              = function() {
	player.playLast();
};
var tooltip             = function(e) {
	var original = this;
	if (chinchilla.radio_mode) return;
	var tooltip = $("<div>", {
		class: "tooltip"
	}).css({
		top:    $(original).offset().top + $(original).height() - 75,
		right:   $(document).width() - $(original).offset().left - 20
	}).html($(original).attr("data-tooltip")).appendTo("body");
	$(original).mouseout(function() {
		$(tooltip).remove();
	});
};

var autocomplete        = function(e) {
	/*
		Trigger search method
	*/
	if (e.keyCode == 37 || e.keyCode == 38 || e.keyCode == 39 || e.keyCode == 40 || e.keyCode == 13 || e.keyCode == 16) {
		return;
	}
	setTimeout(function() {
		var searchfield = $("#search-field"),
			value		= searchfield.val(),
			results     = $("#search-results"),
			clearinput 	= $("#clear-input");

		if (!window.lastsearchtimestamp) {
			window.lastsearchtimestamp = Date.now();
		}
		else {
			var timestamp = Date.now()
			window.lastsearchtimestamp = timestamp;
			setTimeout(function() {
				if (timestamp == window.lastsearchtimestamp) {
					search.autocomplete(value);
				}
			}, 500);
		}
		/*
			Hide/show suggestions
		*/
		if (value === "") {
			$('.search-placeholder').show();
			$('#search-results-wrapper').empty();
			clearinput.hide();

		}
		else {
			clearinput.show();
		}
	}, 1);
};
var addtrack        = function(e) {
	/*
		Trigger search method
	*/
	if (e.keyCode == 37 || e.keyCode == 38 || e.keyCode == 39 || e.keyCode == 40 || e.keyCode == 13 || e.keyCode == 16) {
		return;
	}
	var searchfield = $(".add-tracks-input"),
		value		= searchfield.val(),
		results     = $(".add-tracks-results");
	if (value == '') { results.hide(); }
	else { results.show(); }
	var timestamp = Date.now()
	window.lastsearchtimestamp = timestamp;
	setTimeout(function() {
		if (timestamp == window.lastsearchtimestamp) {
			addtracks.autocomplete(value);
		}
	}, 100);
};
var logout 				= function() {
	var cookies = document.cookie.split(";");

    for (var i = 0; i < cookies.length; i++) {
    	var cookie = cookies[i];
    	var eqPos = cookie.indexOf("=");
    	var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
    	document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
    window.location.reload();
};
var addtolib			= function() {
	console.log($(this).attr('data-id'))
	if ($(this).attr('data-id')) {
		library.add({id: $(this).attr('data-id') + ''});
		return;
	}
	if (!$(this).hasClass('song') && !$(this).hasClass('library-button')) {
		var toadd = ($(this).parents('.song'))[0];
	}
	else {
		var toadd = this;
	}
	var song = helpers.parseDOM(toadd);
	library.add(song);
}
var remfromlib			= function() {
	if ($(this).attr('data-id')) {
		library.remove({id: $(this).attr('data-id') + ''});
		return;
	}
	if (!$(this).hasClass('song') && !$(this).hasClass('library-remove-button')) {
		var torem = ($(this).parents('.song'))[0];
	}
	else {
		var torem = this;
	}
	var song = helpers.parseDOM(torem);
	library.remove(song);
}
var clearinput 			= function() {
	$("#search-field").val("").keyup().focus();
	$('.search-placeholder').show();
	$('#search-results-wrapper').empty();
	$('#clear-input').hide();
	window.lastsearchtimestamp = null;
}
var rightclick			= function(e) {
	e.preventDefault()
	var obj = {
		song: helpers.parseDOM(e.currentTarget),
		e: e,
		left: e.pageX
	}
	if ($('.selected').size() > 1) {
		delete obj.song;
		obj.tracklist = _.map($('.selected').toArray(), function(a) { return $(a).attr('data-id') })
	}
	contextmenu(obj);
}
var playlistmenu 		= function(e) {
	e.preventDefault();
	var obj = {
		e: e,
		left: e.pageX,
		playlist: e.currentTarget
	}
	contextmenu(obj);
}
var contextmenu 		= function(obj) {
	/*
		First, remove all the other contextmenus
	*/
	$('.contextmenu').remove();
	/*
		Build a placeholder for the contextmenu
	*/
	var placeToAppend = obj.song ? '#view' : '#sidebar'
	var scrollHeight = $(placeToAppend)[0].scrollHeight;
	var height = $(document).height();
	var width = $(document).width();
	var offsets = {
		top:  obj.e.pageY,
		left: obj.left,
		bottom: height - obj.e.pageY,
		right: width - obj.left
	}
	var pos = (obj.e.pageY < height/2) ? offsets.top : offsets.bottom;
	var posX = (obj.e.pageX < width/2) ? offsets.left : offsets.right;
	var toporbottom = (obj.e.pageY < (height/2)) ? 'top' : 'bottom'
	var leftorright = (obj.e.pageX < (width/2)) ? 'left' : 'right'
	var menu = $('<div>', {
		class: 'contextmenu',
	})
	.css(leftorright, posX)
	.css(toporbottom, pos)

	$(placeToAppend).append(menu)
	/*
		Remove the menu when you click on anything
	*/
	if (obj.song) {
		var represents = $(obj.e.currentTarget).parents('[data-represents]').data('represents');
		$(document).one('click', '.contextmenu-add-to-playlist', function(e) {
			$(this).parents('.context-options').html(loader.spinner());
			e.stopPropagation();
			$.ajax({
				url: '/api/playlist-dialogue',
				data: { song: $(this).attr('data-id') + '', token: chinchilla.token },
				dataType: 'html',
				success: function (html) {
					$('.context-options').html(html);
				}
			});
		});
		var song = obj.song;
		/*
			Fetch context menu
		*/
		var output = templates.buildSongContextMenu({song: song, inlib: _.contains(oneTune.library(), song.id + ''), loggedin: chinchilla.loggedin, represents: represents});
		menu.html(output);

	}
	else if (obj.playlist) {
		var playlist = $(obj.playlist).attr('data-navigate');
		$.ajax({
			url: '/api/playlist-menu',
			data: {playlist: playlist, token: chinchilla.token},
			dataType: 'html',
			success: function (response) {
				menu.addClass('playlist-contextmenu');
				menu.html(response);
			}
		});
	}
	else if (obj.tracklist) {
		var represents = $(obj.e.currentTarget).parents('[data-represents]').data('represents');
		menu.html(templates.buildMultipleSongContextMenu({songs: obj.tracklist, loggedin: chinchilla.loggedin, represents: represents}))
	}
	$(document).one('click', function() {
		menu.remove();
	});
}
var setchange			= function() {
	var dom = $('.settings .setting');
	var settings = []
	$.each(dom, function(a, setting) {
		var setting = {
			key: $(setting).data('setting'),
			label: $(setting).find('label').text(),
			value: $(setting).find('input').is(':checked')
		}
		settings.push(setting);
		chinchilla.settings[setting.key] = setting.value;
	});
	$.ajax({
		url: '/api/settings/update',
		data: {settings: settings, token: chinchilla.token},
		dataType: 'json',
		success: function (response) {
			if (response.success) {
				notifications.create('Settings saved.');
			}
		}
	})
	notifications.create('Saving...');
}
var ordersongs			= function() {
	var mode,
		header = $(this);
	//Descending
	if 		( header.hasClass('ascending')) 	{ header.addClass('descending'); header.removeClass('ascending');  mode = 'desc'}
	//Normal
	else if ( header.hasClass('descending')) 	{ header.removeClass('descending'); mode = 'default'}
	//Ascending
	else 										{ header.addClass('ascending'); mode = 'asc'}
	$(header).siblings('[data-order]').removeClass('ascending descending')
	var	sortby = (mode == 'default') ? 'index' : header.attr('data-value'),
		table  = header.parents('.table-wrapper').eq(0).find('table'),
		songs  = $(table).find('.song'),
		sorted = _.sortBy(songs, function(song) { var a = $(song).data(sortby); return (!isNaN(a) ? parseFloat(a) : a) }),
		revers = (mode == 'desc') ? sorted.reverse() : sorted;
		html   = '';
		console.log(table);
	/*
		Remove the old songs
	*/
	songs.remove();
	/*
		Add new songs
	*/
	$.each(sorted, function(k, song) {  table.append(song) }  );
}
var findindom 			= function(dom) {
	var rep = $(dom).parents('[data-represents]');
	var id = $(dom).attr("data-id");
	return ($(rep).find('.song[data-id='+id+']').eq(0))[0];
}
var findandplay 		= function(e) {
	var dom = $('.song[data-id="' + $(this).data('id') + '"]')
	var song = helpers.parseDOM(dom[0]);
	var currentlyPlaying = player.nowPlaying.get();
	if (currentlyPlaying && currentlyPlaying.id+'' == song.id+'') {
		player.togglePlayState();
	}
	else {
		dom.dblclick();
	}
}
var playbutton 			= function(song, event) {
	var track = helpers.parseDOM(song), playing = player.nowPlaying.get();
	if (playing && track.id+'' == playing.id+'') {
		var state = ytplayer.getPlayerState();
		if (state == 1) {
			ytplayer.pauseVideo();
		}
		else {
			ytplayer.playVideo();
			$('.now-playing').addClass('hearable');
			oneTune.hearable(true);
		}
	}
	else {
		convertDOMToQueue(song);
		$('.now-playing').addClass('hearable');
		oneTune.hearable(true)
	}
}
var findandqueue 		= function() {
	var duration 		= _.pluck(player.queues.queue, 'duration'),
		totalduration 	= _.reduce(duration, function(a, b) { return a + parseFloat(b) }, 0),
		currentposition = ytplayer.getCurrentTime(),
		songlength 		= ytplayer.getDuration()
		untilplayed 	= totalduration + songlength*1000 - currentposition*1000,
		label 			= helpers.parsehours(untilplayed),
		song 			= helpers.parseDOM($('.song[data-id="' + $(this).data('id') + '"]')[0]);
	player.queues.primaryQueue.push(song);
	$.publish('queue-changed');
	notifications.create(song.name + ' was added to the queue. It will be played in ' + label + '.');
	updateHints();
}
var addalbumtolib 		= function() {
	var album 		= $(this).parents('.album');
	var songs 		= album.find('.song.recognized');
	var array 		= [];
	$.each(songs, function(key, value) {
		array.push(helpers.parseDOM(value));
	});
	library.batchAdd(array);
}
var addtrackskeys 		= function(key) {
	var classname = 'add-tracks-selected'
	if (key == 13) {
		$('.'+classname).click();
	}
	else {
		var dom = $('.' + classname);
		var direction = (key == 38) ? 'prev' : 'next'
		var next = dom[direction]('span');
		if (next.length != 0) {
			$(next)	.addClass(classname);
			$(dom)	.removeClass(classname);
		}
	}
}
var searchkeys 			= function(key) {
	var classname = 'search-selected'
	if (key == 13 && $('#search-results').hasClass('search-results-visible')) {
		$('.'+classname).mousedown().click();
	}
	else {
		var dom = $('.' + classname);
		var direction = (key == 38) ? 'prevAll' : 'nextAll'
		var next = dom[direction]('li');
		if (next.length != 0) {
			$(next[0])	.addClass(classname);
			$(dom)	.removeClass(classname);
		}
	}
}
var keysdown 			= function(e) {
	var key = e.keyCode;
	/*
		Down key
	*/
	if (key == 70 && e.metaKey && window.location.pathname.match('/p/')) {
		e.preventDefault();
		showfilter();
		return;
	}
	if (key == 27) {
		$('.pl-v3-filter').hide();
		$('.add-menu-visible').removeClass('add-menu-visible');
		$('.more-menu-visible').removeClass('more-menu-visible');
	}
	if (key == 40 || key == 38) {
		e.preventDefault();
		e.stopPropagation();
		if ($('input:focus').length > 0) {
			if ($('#search-field').is(':focus')) {
				searchkeys(key)
			}
			return;
		}
		var thissong = $('.song.selected')
		var upordown = (key == 40) ? 'next' : 'prev';
		var next = thissong[upordown]('.song').addClass('selected');
		if (!e.shiftKey && next.length != 0) {
			thissong.removeClass('selected');
		}
	}
}
var keys 				= function(e) {
	var key = e.keyCode;
	/*
		Don't trigger this function when focus is in input
	*/
	var srcElement = e.srcElement || e.target;
	if ($(srcElement).is('input') || $(srcElement).is('[contenteditable]') || $(srcElement).is('textarea')) {
		if (($(srcElement).is('.add-tracks-input')) || ($(srcElement).is('#search-field')) || ($(srcElement).is('.pl-label')) || $(srcElement).is('.new-playlist-input-field') || $(srcElement).is('.edit-metadata-input') || $(srcElement).is('.register-input') || $(srcElement).is('textarea')) {
			if (key != 13) {
				return;
			}
		}
	}
	e.preventDefault();
	/*
		Enter key
	*/
	if (key == 13) {
		if ($('.add-tracks-dropdown').is(':visible')) {
			addtrackskeys(key)
			return;
		}
		if ($('#search-results').is(':visible')) {
			e.preventDefault();
			searchkeys(key)
			return;
		}
		if ($('.compose-suggestions').is(':visible')) {
			e.preventDefault();
			submit.selectSong($('.add-tracks-selected').eq(0).data());
		}
		var songs 		= $('.song.selected').click();
	}
	if (key == 39) {
		player.playNext();
	}
	if (key == 37) {
		player.playLast();
	}
	if (key == 32) {
		if (!$('input').is(':focus')) {
			player.togglePlayState()
		}
	}

}
var hidenotification  	= function() {
	$(this).parents('.notification').remove()
}
var warnexit 			= function() {
	if (chinchilla.loggedin && chinchilla.settings.warn_before_leave) {
		return 'You are leaving the page but the music is still playing. Do you really want to leave? (You can turn this notification off in the settings)';
	}
}
var showalbum 			= function() {
	$(this).hide().next('.hidden-album-container').show();
}
var newplaylist 		= function() {
	$(".new-playlist-input").show().find("input").val('').focus();
	$('html').one('click', function() {
		$(".new-playlist-input").hide().off();
		$('.new-playlist-input-field').off();
	});
	$('.new-playlist-input').on('click', function(e) {
		e.stopPropagation();
	});
	$('.new-playlist-input-field').on('keypress', submitplaylist);

}
var submitplaylist 		= function(e) {
	if (e.keyCode == 13) {
		var inputfield 	= $('.new-playlist-input-field'),
			input 		= inputfield.val()
		inputfield.off();
		$.ajax({
			url: '/api/playlists/create',
			dataType: 'json',
			data: {name: input, token: chinchilla.token},
			success: function (response) {
				if (response.success) {
					if (response.socket == 'playlist-added') {
						pladded(response.socket_body);
					}
				}
				else {
					if (response.socket == 'playlist-addition-failed') {
						pladdfail(response.socket_body);
					}
				}
			}
		});
	}
}
var renameplaylistinline = function() {
	$('.playlist-more-menu').removeClass('more-menu-visible');
	var url = $('#view').attr('data-route');
	var label = $('#view h1')
	var name = label.text();
	label.addClass('edit-mode').attr('contenteditable', true).focus();
	label.on('keypress', function (e) {
		if (e.keyCode == 13) {
			$(this).off().removeAttr('contenteditable').removeClass('edit-mode')
			$('body').off();
			$.ajax({
				url: '/api/playlists/rename',
				data: {oldname: url, newname: $(label).text(), token: chinchilla.token},
				dataType: 'json',
				success: function (data) {
					if (data.success) {
						console.log(data.socket)
						if (data.socket == 'playlist-renamed') {
							plrenamed(data.socket_body);
						}
					}
					else {
						if (data.socket == 'playlist-renamed-failed') {
							pladdfail(data.socket_body);
						}
					}
				}
			});
		}
	});
	$('body').one('click', function() {
		$(label).off().removeAttr('contenteditable').removeClass('edit-mode');
		$(label).text(name);
	});
	function selectElementContents(el) {
	    var range = document.createRange();
	    range.selectNodeContents(el);
	    var sel = window.getSelection();
	    sel.removeAllRanges();
	    sel.addRange(range);
	}
	selectElementContents($(label)[0]);

}
var renameplaylist 		= function() {
	var url = $(this).data('id'),
		name = $(this).data('name');
	var playlist = $('#sidebar [data-navigate="' + url+ '"]');
	var label = playlist.find('.pl-label').attr('contenteditable', true).focus();
	$(label).on('keypress', function(e) {
		if (e.keyCode == 13) {
			$(label).off().removeAttr('contenteditable');
			$('body').off();
			$.ajax({
				url: '/api/playlists/rename',
				data: {oldname: url, newname: $(label).text(), token: chinchilla.token},
				dataType: 'json',
				success: function (data) {
					if (data.success) {
						console.log(data.socket)
						if (data.socket == 'playlist-renamed') {
							plrenamed(data.socket_body);
						}
					}
					else {
						if (data.socket == 'playlist-renamed-failed') {
							pladdfail(data.socket_body);
						}
					}
				}
			});
		}
	});

	function selectElementContents(el) {
	    var range = document.createRange();
	    range.selectNodeContents(el);
	    var sel = window.getSelection();
	    sel.removeAllRanges();
	    sel.addRange(range);
	}
	selectElementContents($(label)[0]);
	$('body').one('click', function() {
		$(label).off().removeAttr('contenteditable');
		$(label).text(name);
	});
	$(label).on('click', function(e) {
		e.stopPropagation();
	});
}
var deleteplaylist 		= function(url) {
	if (!url) {
		var url = $(this).data('id');
	}
	var playlist = $('#sidebar [data-navigate="' + url+ '"]');
	$.ajax({
		url: '/api/playlists/delete',
		dataType: 'json',
		data: {url: url, token: chinchilla.token},
		success: function(data) {
			if (data.success) {
				if (data.socket == 'playlist-removed') {
					plremoved(data.socket_body);
				}
			}
		}
	});
}
var suppressrenaming 	= function(e) {
	e.stopPropagation();
}
var addsongtopl 		= function() {
	var data = $(this).data();
	var socketdata = {
		type: 'playlist',
		tracks: [data.songid],
		token: chinchilla.token,
		destination: data.url,
		type: 'playlist'
	}
	$.ajax({
		url: '/api/add_tracks',
		dataType: 'json',
		data: socketdata,
		success: library.ajaxResponse
	});
	notifications.create('Adding...')
}
var remsongfrompl 		= function() {
	var data = $(this).data();
	library.removeMultiple([data.songid], 'playlist', data.url)
}
var pldropdown 			= function() {
	$.ajax({
		url: '/api/pl-options',
		dataType: 'html',
		data: {playlist: $('#view').attr('data-route'), token: chinchilla.token },
		success: function(html) {
			$('.playlist-options-dropdown').html(html);
		}
	});
}
var mkplpublic 			= function() {
	notifications.create('Change privacy...')
	var url = $(this).attr('data-url');
	$.ajax({
		url: '/api/playlists/privacy',
		dataType: 'json',
		data: {playlist: url, token: chinchilla.token, 'public': true, date: Date.now()},
		success: function (data) {
			if (data.success) {
				oneTune.playlists(_.map(oneTune.playlists(), function (playlist) {
					if (playlist.url == url) {  playlist['public'] = true; }
					return playlist;
				}));
				$('.publish-playlist').removeClass('publish-playlist').addClass('unpublish-playlist').find('span').text('Unpublish playlist');
				notifications.create('Playlist published.');
			}
		}
	})
}
var mkplprivate 		= function() {
	notifications.create('Change privacy...')
	var url = $(this).attr('data-url');
	$.ajax({
		url: '/api/playlists/privacy',
		dataType: 'json',
		data: {playlist: url, token: chinchilla.token, 'public': false, date: Date.now()},
		success: function (data) {
			if (data.success) {
				oneTune.playlists(_.map(oneTune.playlists(), function (playlist) {
					if (playlist.url == url) {  playlist['public'] = false; }
					return playlist;
				}));
				$('.unpublish-playlist').removeClass('unpublish-playlist').addClass('publish-playlist').find('span').text('Publish playlist');
				notifications.create('Playlist unpublished.');
			}
		}
	});
}
var followplaylist 		= function () {
	notifications.create('Following...')
	var url = $(this).attr('data-url');
	$.ajax({
		url: '/api/playlists/follow',
		dataType: 'json',
		data: {url: url, token: chinchilla.token, follow: true, date: Date.now()},
		success: function (data) {
			if (data.success) {
				var div = $('.follow-playlist').removeClass('follow-playlist').addClass('unfollow-playlist').addClass('action-just-happened');
				div.find('span').text('Unfollow playlist');
				div.find('img').removeClass('png-icon-unsave').addClass('png-icon-save');

				$(div).one('mouseleave', function () {
					$(div).removeClass('action-just-happened')
				});
				notifications.create('You are now following this playlist.');
				oneTune.playlists(_.reject(oneTune.playlists(), function (playlist) {
					return playlist.url == url;
				}));
				oneTune.playlists.push(data.playlist);
				if ($('.followed-playlists').size() == 0) {
					var playlistcontainer = $('<div>').addClass('followed-playlists');
					playlistcontainer.html(data.menuitem);
					$('.playlists-menu').after(playlistcontainer)
					$('.playlists-menu').after($('<h2 class="followed-playlist-h2">').text('Followed playlists'));
				}
				else {
					$('.followed-playlists').append(data.menuitem);
				}
				var followercount = parseInt($('.playlist-followercount').text());
				followercount++;
				$('.playlist-followercount').text(followercount == 1 ? '1 follower' : (followercount + ' followers'));
			}
			else {
				notifications.create(data.notification)
			}
		}
	});
}
var unfollowplaylist 		= function () {
	notifications.create('Unfollowing...')
	var url = $(this).attr('data-url');
	$.ajax({
		url: '/api/playlists/follow',
		dataType: 'json',
		data: {url: url, token: chinchilla.token, follow: false},
		success: function (data) {
			if (data.success) {
				var div = $('.unfollow-playlist').removeClass('unfollow-playlist').addClass('follow-playlist').addClass('action-just-happened');
				div.find('span').text('Follow playlist');
				div.find('img').removeClass('png-icon-save').addClass('png-icon-unsave');

				$(div).one('mouseleave', function () {
					$(div).removeClass('action-just-happened')
				});
				notifications.create('You have unfollowed this playlist.');
				oneTune.playlists(_.reject(oneTune.playlists(), function (playlist) {
					return playlist.url == url;
				}));
				$('.followed-playlist-h2,.followed-playlists [data-navigate="' + url + '"]').remove();
				var followercount = parseInt($('.playlist-followercount').text());
				followercount--;
				$('.playlist-followercount').text(followercount == 1 ? '1 follower' : (followercount + ' followers'));
			}
			else {
				notifications.create(data.notification)
			}
		}
	});
}
var mkplnwattop 		= function() {
	$('.make-playlist-newest-at-top').removeClass('dropdown-no-check').addClass('dropdown-check');
	$('.make-playlist-newest-at-bottom').addClass('dropdown-no-check').removeClass('dropdown-check');
	var url 	= $('#view').attr('data-route');
	var label 		= $('.playlist-privacy');
	$.ajax({
		url: '/api/playlists/order',
		dataType: 'html',
		data: {playlist: url, token: chinchilla.token, 'newestattop': true}
	});
	oneTune.playlists(_.map(oneTune.playlists(), function (playlist) {
		if (playlist.url == url) {
			playlist.newestattop = true;
		}
		return playlist;
	}));
}
var mkplnwatbottom 		= function() {
	$('.make-playlist-newest-at-top').addClass('dropdown-no-check').removeClass('dropdown-check');
	$('.make-playlist-newest-at-bottom').removeClass('dropdown-no-check').addClass('dropdown-check');
	var url 	= $('#view').attr('data-route');
	var label 		= $('.playlist-privacy');
	$.ajax({
		url: '/api/playlists/order',
		dataType: 'html',
		data: {playlist: url, token: chinchilla.token, 'newestattop': false}
	});
	oneTune.playlists(_.map(oneTune.playlists(), function (playlist) {
		if (playlist.url == url) {
			playlist.newestattop = false;
		}
		console.log(playlist, url)
		return playlist;
	}));
}
var closenotification 	= function() {
	$('#statusbar').hide();
}
var playallsongs 		= function() {
	var songs = $(this).parents('[data-represents]').find('.song');
	var randomtrack = songs[Math.floor(Math.random()*songs.length)];
	convertDOMToQueue(randomtrack, true, true);
}
var playallsongsinorder = function() {
	var firsttrack = $($(this).parents('[data-represents]')[0]).find('.song').eq(0)[0];
	convertDOMToQueue(firsttrack);
}
var playviewinorder = function() {
	var firsttrack = $('#view').find('[data-represents]').find('.song').eq(0)[0];
	convertDOMToQueue(firsttrack);
}
var hoversearchresult 	= function() {
	var classname = 'search-selected';
	$('.' + classname).removeClass(classname);
	$(this).addClass(classname);
}
var filterdropdown 		= function() {
	var list = $(this).data('list');
	templates.buildFilter({list: list});
}
var preventScrolling 	= function(evt) {
    var keyCode = evt.keyCode;
    if (keyCode == 38 || keyCode == 40) {
        return false;
    }
}
var trigger  			= function() {
	var ut = document.querySelector('[data-untrigger]');
	var _trigger = $(this).data('trigger')
	var callback = function() {
		$(this).attr('data-untrigger', _trigger)
		$('.' + _trigger).show();
		$(this).removeAttr('data-trigger');
	}
	if (ut != undefined) {
		untrigger.bind(ut)(callback.bind(this));
	}
	else { callback.bind(this)(); }
	if (_trigger == 'add-tracks-dropdown') {
		$('.add-tracks-input').focus();
	}
}
var untrigger 			= function(callback) {
	var trigger = $(this).data('untrigger');
	var timeout = 0;
	if (trigger == 'filter-dropdown') {
		timeout = 300;
		$('.filter-dropdown').find('label').addClass('pop-away');
	}
	if (trigger == 'add-tracks-dropdown') {
		timeout = 300;
		$('.add-tracks-dropdown').find('.add-tracks-input').addClass('pop-away');
	}
	if (trigger == 'playlist-import-tip') {
		timeout = 300;
		$('.playlist-import-tip').addClass('pop-away');
	}
	setTimeout((function() {
		$('.' + trigger).hide();
		$(this).attr('data-trigger', trigger);
		if (_.isFunction(callback)) { callback(); }
		$('.pop-away').removeClass('pop-away');
	}).bind(this), timeout);
	$(this).removeAttr('data-untrigger')
}
var loadcover 			= function() {
	$(this).fadeIn().addClass('coverstack-coer-loaded');
}
var showYouTubePage 	= function() {
	$('body').addClass('youtube-player-visible');
	$('#view').html('');
	$.publish('view-got-loaded')
}
var hideYouTubePage 	= function() {
	$('body').removeClass('youtube-player-visible');
}
var showImportPage 		= function() {
	var template = $('#import-template').html();
	var output = _.template(template, {
			importqueue: importqueue,
			tracktmpl: $('#import-track-template').html(),
			playlists: oneTune.playlists()
		});

	$('#view').html(output);
	$('#playlist-target').val(chinchilla.playlist_target ? chinchilla.playlist_target : '/library')
	$.publish('view-got-loaded');
}
var startqueue 			= function() {
	startQueue();
}
var stopqueue 			= function() {
	stopQueue();
}
var pltargetchanged 	= function() {
	chinchilla.playlist_target = this.value;
}
var startradiosong 		= function() {
	notifications.create('Creating radio...')
	//socket.emit('/radio/start-radio/track', {id: $(this).data('id')})
}
var radiostation 		= function() {
	radio.loadIntoDOM({radio_id: $(this).data('id')})
}
var jumptorepresents 	= function() {
	if (window.location.pathname == player.queues.current.represents) {
		$('[data-represents="'+player.queues.current.represents+'"]').find('h1').addClass('orange-blink');
		setTimeout(function() {
			$('.orange-blink').removeClass('orange-blink');
		}, 2000);
		return;
	}
	navigation.to(player.queues.current.represents);
}
var reportselect 		= function() {
	$('.report-selected').removeClass('report-selected');
	$(this).addClass('report-selected');
	player.pause();
	$('.report-preview').remove();
	$('.report-youtube').html('<iframe width="560" height="315" src="//www.youtube.com/embed/' + $(this).data('reportytid') + '" frameborder="0" allowfullscreen></iframe>');
	$('.report-youtube-input').val('http://youtube.com/watch?v=' + $(this).data('reportytid'));

}
var reportsubmit 		= function() {
	$('.report-loading-indicator').show();
	$(this).prop('disabled', 'true');
	var songid = $(this).data('submit'),
		new_ytid = ($('.report-youtube-input').val()).substr(27, 11);
	$.ajax({
		url: '/api/report',
		type: 'POST',
		dataType: 'json',
		data: {song_to_change: songid, fields_to_change: { ytid: new_ytid }, type: 'change-video'},
		success: function (data) {
			$('.report-loading-indicator').hide();
			if (!data.success) {
				$(this).prop('disabled', false);
			}
			else {
				DB.putUpdates([{
					track_id: songid,
					fields_changed: {
						ytid: new_ytid
					}
				}], function() {});
			}
			$('.report-feedback').text(data.socket_body.msg);
		}
	})
}
var searchresult = function() {
	$('#search-results').removeClass('search-results-visible');
}
var doubleclickPlaylist = function() {
	if ($('#view').hasClass('view-loading')) {
		$.subscribe($('#view').data('route') + '/loaded', function() {
			playviewinorder();
		});
	}
	else { playviewinorder(); }
}
var prevQueue = function() {
	player.queues.prevQueue();
}
var nextQueue = function() {
	player.queues.nextQueue();
}
var searchfocused = function() {
	$('#search-results').addClass('search-results-visible');
}
var mousedown = function(e) {
	var srcElement = e.srcElement || e.target;
	var results = $(srcElement).parents('#search-results');
	var results_field = $(srcElement).parents('#search-field');
	var results_is_field = $(srcElement).is('#search-field') || $(srcElement).is('#clear-input');
	if (results.length == 0 && results_field.length == 0 && !results_is_field ) {
		$('#search-results').removeClass('search-results-visible');
	}
}
var togglewikicollapse = function() {
	$('.wikipedia-description').toggleClass('wiki-collapsed');
}
var editmetadata = function() {
	$('.edit-metadata-container').show();
	$('.metadata-finished-container').hide();
}
var submitmetadata = function() {
	if ($('.song-page-submit-metadata').hasClass('metadata-submitting')) {
		return;
	}
	var track = _.string.escapeHTML($('#edit-metadata-title-input').val());
	var artist = _.string.escapeHTML($('#edit-metadata-artist-input').val());
	var album = _.string.escapeHTML($('#edit-metadata-album-input').val());
	var track_id = ($(this).parents('[data-represents]').attr('data-represents')).substr(6)
	var socket_object = {
		song_to_change: track_id,
		fields_to_change: {},
		type: 'correct-metadata'
	}
	if (track != '') {
		socket_object.fields_to_change.name = track;
	}
	if (artist != '') {
		socket_object.fields_to_change.artist = artist;
	}
	if (album != '') {
		socket_object.fields_to_change.album = album;
	}
	if (track == '' && artist == '' && album == '') return;
	$('.song-page-submit-metadata').text('Saving...').addClass('metadata-submitting');
	$.ajax({
		url: '/api/report',
		dataType: 'json',
		type: 'POST',
		data: socket_object,
		success: function (data) {
			$('.song-page-submit-metadata').removeClass('metadata-submitting');
			if (!data.success) {
				$('.song-page-submit-metadata').text(data.socket_body.msg);
				return;
			}
			$('.song-page-submit-metadata').text('Saved!');
			notifications.create('Changes saved locally. We\'ll take a look and apply is globally soon.')
			DB.putUpdates([
			{
				track_id: track_id,
				fields_changed: socket_object.fields_to_change
			}
			], function() {});
			$('.edit-metadata-container').hide();
			$('.metadata-finished-container').show();
			if (socket_object.fields_to_change.name) {
				$('.song-page-track-title').text(socket_object.fields_to_change.name);
			}
			if (socket_object.fields_to_change.artist) {
				$('.song-page-subtitle').text(socket_object.fields_to_change.artist);
			}
			$('.song-page-edit-metadata').hide();
		}
	});
}
var playerimgload1 = function() {
	$("#nowplaying-image").css({opacity: 1});
	$("#nowplaying-image2").css({opacity: 0});
}
var playerimgload2 = function() {
	$("#nowplaying-image2").css({opacity: 1});
	$("#nowplaying-image").css({opacity: 0});
}
var checkusername  = function() {
	$('.username-disable').prop('disabled', true);
	if ($(this).val() == '') {
		$('.username-availability-indicator').text('No username entered').removeClass('not-available available')
	}
	else {
		$('.username-availability-indicator').text('Checking...').removeClass('not-available available')
		$.ajax({
			url: '/api/register/check-name',
			data: {username: $(this).val()},
			dataType: 'json',
			success: function (response) {
				if ($('#register-username-input').val() == response.query.username) {
					$('.username-availability-indicator').removeClass('not-available available').addClass(response.exists ? 'not-available': 'available').text(response.exists ? 'Username taken.' : 'Username is available!');
					$('.username-disable').prop('disabled', response.exists);
				}
			}
		})
	}
}
var sendusername 	= function() {
	$('.username-disable').prop('disabled', true);
	$('.username-availability-indicator').text('Sending...').removeClass('not-available available')
	$.ajax({
		url: '/api/register/name-chosen',
		dataType: 'json',
		data: {id: $(this).attr('data-id'), username: $('#register-username-input').val()},
		success: function (response) {
			document.cookie = "token=" + response.token + "; expires=Fri, 31 Dec 9999 23:59:59 GMT 12:00:00 GMT; path=/";
			window.location.href = '/';
		}
	});
}
var register 		= function(e) {
	e.preventDefault();
	var email = $('.register-email').val();
	var username = $('#register-username-input').val();
	var password = $('.register-password').val();
	if (email && username && password) {
		$.ajax({
			url: '/api/register/classic',
			dataType: 'json',
			data: {email: email, username: username, password: password},
			success: function  (response) {
				if (response.success) {
					if (response.socket == 'register-successful') {
						onRegisterSuccessful(response.socket_body);
					}
				}
				else {
					if (response.socket == 'register-failed') {
						onRegisterFailed(response.socket_body);
					}
				}
			}
		});
		$('.username-availability-indicator').text('Sending...').removeClass('not-available available');
		$('.username-disable').prop('disabled', true);
	}
	else {
		$('.username-availability-indicator').text('Please fill out all fields.').addClass('not-available').removeClass('available')
	}
}
var login 			= function(e) {
	e.preventDefault();
	var username = $('.login-username').val();
	var password = $('.login-password').val();

	if (username && password) {
		$.ajax({
			url: '/api/register/login',
			data: {username: username, password: password},
			dataType: 'json',
			type: 'POST',
			success: function (response) {
				if (response.success) {
					if (response.socket == 'login-successful') {
						onLoginSuccessful(response.socket_body);
					}
				}
				else {
					onLoginFailed(response.socket_body)
				}
			}
		});
		$('.login-submit').prop('disabled', true).text('Logging in...');
	}
	else {
		$('.login-fail-indicator').text('Please fill out both fields.');
	}
}
var addmultiple = function() {
	library.addMultipleByIdList(($(this).attr('data-ids')).split(','))
}
var removemultiple = function() {
	library.removeMultiple(($(this).attr('data-ids')).split(','), 'library', '/library');
}
var plremovemultiple = function() {
	library.removeMultiple(($(this).attr('data-ids')).split(','), 'playlist', $(this).attr('data-url'))
}
var hidevolume = function () {
	$('#volume-control').hide();
}
var volumecontrol = function () {
	if ($('#volume-control').is(':visible')) {
		hidevolume();
	}
	else {
		var volume = ytplayer.getVolume();
		$('#volume-slider-inner').css('height', ytplayer.getVolume() + '%');
		$('#volume-control').show();
		$(document).one('click', hidevolume);
	}
}
var changevolume = function (e) {
	var mousemove = function (a) {
		var x = a.pageY - 255;
		var volume = (73 - x)/73*100;
		if (volume > 100) {
			volume = 100;
		}
		$('#volume-slider-inner').css('height', volume + '%');
		ytplayer.setVolume(volume);
	}
	mousemove(e);
	$(document).on('mousemove', mousemove);
	$(document).one('mouseup', function (c) {
		$(document).off('mousemove');
		mousemove(c);
	});
}
var playList = function() {
	var rep = $(this).parents('[data-represents]');
	var first = $(rep).find('.song')[0]
	convertDOMToQueue(first);
}
var changeSubmitSub = function() {
	$('.submit-sub-selected').removeClass('submit-sub-selected');
	$(this).addClass('submit-sub-selected');
}
var changeSubmitType = function() {
	$('.submit-type-selected').removeClass('submit-type-selected');
	$(this).addClass('submit-type-selected');
	var type = $(this).attr('data-type');
	if (type == 'playlist') {
		submit.buildSubmitPlaylist();
	}
	if (type == 'song') {
		submit.showSong();
	}
	if (type == 'story') {
		submit.showStory();
	}
}
var submitcomment = function() {
	var comment = $(this).parents('.post-new-comment').eq(0);
	$(comment).find('.submit-comment').text('Sending...');
	var commentarea = $(comment).find('.new-comment-textarea');

	var body = {
		content: commentarea.val(),
		slug: $(comment).attr('data-slug'),
		token: chinchilla.token
	}
	var replyto = $(comment).attr('data-reply-to');
	if (replyto && replyto.length > 0) {
		body.reply_to = replyto;
	}
	$.ajax({
		url: '/api/comments/create',
		data: body,
		type: 'POST',
		success: function (data) {
			if (data.success) {
				if (replyto && replyto.length > 0) {
					commentarea.val('');
					$(comment).parents('.comment').eq(0).find('.replies').eq(0).prepend(data.html);
				}
				else {
					$('.comment-section').prepend(data.html);
				}
				$(comment).hide();
				$(comment).find('.submit-comment').text('Send');
			}
			else {
				$(comment).find('.comment-error-area').text(data.msg).show();
				$(comment).find('.submit-comment').text('Send');
			}
		}
	});
}
var submitpost = function() {
	$('.submit-submit').text('Sending...');
	var data = {
		sub: $('.submit-sub-selected').text(),
		entity: $('.submit-type-selected').attr('data-type'),
		token: chinchilla.token
	}
	if (data.entity == 'song') {
		var song_id = $('.submit-song-box').attr('data-id')
		if (song_id) {
			data.id = song_id;
		}
	}
	if (data.entity == 'playlist') {
		var playlist_id = $('.submit-playlist-selected').attr('data-url');
		if (playlist_id) {
			data.id = playlist_id;
		}
	}
	if (data.entity == 'story') {
		data.title = $('.submit-post-title').val();
		data.content = $('.submit-post-content').val();
	}
	$.ajax({
		url: '/api/community/submit',
		type: 'POST',
		success: function (data) {
			if (data.success) {
				navigation.to('/one/' + data.post.sub + '/' + data.post.slug + '/' + data.post.url);
			}
			else {
				$('.submit-submit').text('Send');
				$('.one-submit-error').html(data.msg);
			}
		},
		data: data,
		dataType: 'json'
	});
}
var changeLang = function() {
	var lang = $(this).attr('data-lang');
	$.ajax({
		url: '/api/languages/set',
		data: {
			lang: lang
		},
		dataType: 'json',
		success: function () {
			window.location.reload();
		}
	});
}
var selectAnother = function() {
	$('.song-picker-activator, .song-picker').show();
	$('.selected-area').empty();
	$('.song-picker-input').val('').focus();
}
var upvotePost = function() {
	if (!chinchilla.loggedin) {
		showLoginPopup('Login to vote on submissions and create your personal library. It\'s fun!');
		return;
	}
	/*
		Either upvote or un-upvote
	*/
	var vote = $(this).hasClass('upvoted') ? 0 : 1;
	$.ajax({
		url: '/api/post/vote',
		data: {token: chinchilla.token, sub: $(this).attr('data-sub'), slug: $(this).attr('data-slug'), vote: vote},
		dataType: 'json'
	});
	var mod = $(this).parents('.vote-module').eq(0)
	mod.find('.downvote-post').removeClass('downvoted');
	var votediff = vote - parseInt($(mod).attr('data-vote'));
	$(mod).attr('data-vote', vote);
	$(this)[vote ? 'addClass' : 'removeClass']('upvoted');
	var vc = $(mod).find('.upvote-count');
	vc.text(parseInt(vc.text()) + votediff);
}
var downvotePost = function() {
	if (!chinchilla.loggedin) {
		showLoginPopup('Login to vote on submissions and create your personal library. It\'s fun!');
		return;
	}
	var vote = $(this).hasClass('downvoted') ? 0 : -1;
	$.ajax({
		url: '/api/post/vote',
		data: {token: chinchilla.token, sub: $(this).attr('data-sub'), slug: $(this).attr('data-slug'), vote: vote},
		dataType: 'json'
	});
	var mod = $(this).parents('.vote-module').eq(0)
	mod.find('.upvote-post').removeClass('upvoted');
	var votediff = vote - parseInt($(mod).attr('data-vote'));
	$(mod).attr('data-vote', vote);
	$(this)[vote == -1 ? 'addClass' : 'removeClass']('downvoted');
	var vc = $(mod).find('.upvote-count');
	vc.text(parseInt(vc.text()) + votediff);
}
var upvoteComment = function() {
	/*
		Either upvote or un-upvote
	*/
	if (!chinchilla.loggedin) {
		showLoginPopup('Login to vote on submissions and create your personal library. It\'s fun!');
		return;
	}
	var vote = $(this).hasClass('upvoted') ? 0 : 1;
	var comment_id = $(this).parents('.comment').eq(0).attr('data-id');
	$.ajax({
		url: '/api/comments/vote',
		type: 'POST',
		data: {token: chinchilla.token, comment: comment_id, vote: vote},
		dataType: 'json'
	});
	var mod = $(this).parents('.vote-module').eq(0)
	mod.find('.downvote-comment').removeClass('downvoted');
	var votediff = vote - parseInt($(mod).attr('data-vote'));
	$(mod).attr('data-vote', vote);
	$(this)[vote ? 'addClass' : 'removeClass']('upvoted');
	var vc = $(mod).find('.upvote-count');
	vc.text(parseInt(vc.text()) + votediff);
}
var downvoteComment = function() {
	if (!chinchilla.loggedin) {
		showLoginPopup('Login to vote on submissions and create your personal library. It\'s fun!');
		return;
	}
	var vote = $(this).hasClass('downvoted') ? 0 : -1;
	var comment_id = $(this).parents('.comment').eq(0).attr('data-id');
	$.ajax({
		url: '/api/comments/vote',
		type: 'POST',
		data: {token: chinchilla.token, comment: comment_id, vote: vote},
		dataType: 'json'
	});
	var mod = $(this).parents('.vote-module').eq(0)
	mod.find('.upvote-comment').removeClass('upvoted');
	var votediff = vote - parseInt($(mod).attr('data-vote'));
	$(mod).attr('data-vote', vote);
	$(this)[vote == -1 ? 'addClass' : 'removeClass']('downvoted');
	var vc = $(mod).find('.upvote-count');
	vc.text(parseInt(vc.text()) + votediff);
}
var selectSubmitPlaylist = function() {
	$('.submit-playlist-selected').removeClass('submit-playlist-selected');
	$(this).addClass('submit-playlist-selected');
}
var viewScrolled = function() {
	var offset = $(this).scrollTop();
	var table_wrapper = $('.extendedtable .table-wrapper')[0];
	if (!table_wrapper) return;
	if (offset > (190 + 45 - 50)) {
		if (!table_wrapper.classList.contains('fixed')) {
			table_wrapper.classList.add('fixed');
			$('.table-header').css('width', $('.extendedtable').width());
		}
	}
	else {
		table_wrapper.classList.remove('fixed');
	}
}
var showreplyfield = function() {
	$(this).parents('.comment').eq(0).find('.reply-field').eq(0).show().find('.post-new-comment').show();
}
var deletecomment = function() {
	var comment = $(this).parents('.comment').eq(0);
	var commentid = $(this).attr('data-id');
	var user_is_sure = confirm('Do you want to delete this comment?');
	if (user_is_sure) {
		$.ajax({
			url: '/api/comments/delete',
			type: 'POST',
			dataType: 'json',
			data: { token: chinchilla.token, comment: commentid},
			success: function() {
				comment.find('.comment-body').eq(0).html('<p class="deleted_comment">[This comment was deleted.]</p>');
				comment.find('.comment-submitter').eq(0).empty();
			}
		});
	}
}
var deletepost = function() {
	var post_id = $(this).attr('data-id');
	var user_is_sure = confirm('Do you want to remove this post?');

	if (user_is_sure) {
		$.ajax({
			url: '/api/community/delete',
			type: 'POST',
			dataType: 'json',
			data: { token: chinchilla.token, post: post_id},
			success: function(data) {
				if (data.success) {
					navigation.to('/');
				}
			}
		});
	}
}
var maximize = function () {
	$(this).text('[-]').removeClass('maximize').addClass('minify');
	$(this).parents('.comment').eq(0).find('> .comment-body, > .comment, > .comment-footer, > .replies, > .vote-module').show();
}
var minify = function () {
	$(this).text('[+]').removeClass('minify').addClass('maximize');
	$(this).parents('.comment').eq(0).find('> .comment-body, > .comment, > .comment-footer, > .replies, > .vote-module').hide();
}
var showLoginPopup = function(text) {
	var template = [
		'<div class="login-popup">',
			'<h6 class="transition-up">Login or register</h6>',
			'<article class="transition-up"><%= text %></article>',
			'<div class="orange-button transition-up" data-navigate="/register">Login</div>',
			'<div class="orange-button white-version transition-up">No, thanks</div>',
		'</div>'
	].join('\n');
	$(_.template(template, {text: text})).appendTo('#backdrop');
	$('#backdrop').show();
}
var hideBackdrop = function() {
	$('#backdrop').hide();
	$('.login-popup').remove();
}
var openInNewTab = function(e) {
	e.preventDefault();
	window.open($(this).attr('href'), '_blank')
}

var skipToSong = function() {
	console.log($('.queue-entry').index(this)+1)
	player.skipNTracks($('.queue-entry').index(this)+1);
}

var showSongPicker = function() {
	var input = $(this);
	var picker = input.parents('.song-picker-activator');
	var container = picker.find('.song-picker-container');
	if (!container.is(':empty')) {
		container.show();
		return;
	}

	var afterDivCreated = function (div_created) {
		container.html(div_created);
		$(div_created).find('.song-picker-object').eq(0).addClass('song-picker-selected');
	}
	songpicker.selectSong({
		input: input,
		div_callback: afterDivCreated,
		songPickedCallback: function (song) {
			if (input.attr('data-action') == 'add-track') {
				setTimeout(function() { input.focus() }, 0)
				$(input).focus();
				var route = $('#view').attr('data-route');
				collections.add(route, song.id)
			}
			else {
				submit.selectSong(song);
			}
		}
	});
}
var hideSongPicker = function() {
	var input = $(this);
	var picker = input.parents('.song-picker-activator');
	var container = picker.find('.song-picker-container');
	container.hide();
}
var songPickerHover = function() {
	$('.song-picker-selected').removeClass('song-picker-selected');
	$(this).addClass('song-picker-selected');
}
var songPickerClick = function() {
	//Emulate enter press
	$('.song-picker-input').trigger($.Event('keydown', { keyCode: 13 })).focus()
}
var plmorebutton = function () {
	var menu = $('.playlist-more-menu')
	menu.addClass('more-menu-visible');
	$(document).on('mouseup', function (e) {
		srcElement = e.srcElement || e.target;
		if (!$(srcElement).hasClass('playlist-more-menu') && $(srcElement).parents('.playlist-more-menu').size() == 0) {
			menu.removeClass('more-menu-visible');
		}
	});
}
var pladdbutton = function () {
	var menu = $('.playlist-add-menu');
	menu.addClass('add-menu-visible');
	$(document).on('mouseup', function (e) {
		srcElement = e.srcElement || e.target;
		$('[data-action="add-track"]').focus();
		if (!$(srcElement).hasClass('playlist-add-menu') && $(srcElement).parents('.playlist-add-menu').size() == 0) {
			menu.removeClass('add-menu-visible');
		}
	});
}

var plfilter = function () {
	var query = this.value.toLowerCase();
	$('[data-represents="' + $(this).data('url') + '"] .song').each(function (key, song) {
		var data = $(song).data();
		if (data.name.toLowerCase().indexOf(query) != -1 || data.artist.toLowerCase().indexOf(query) != -1 || data.album.toLowerCase().indexOf(query) != -1) {
			$(song).show();
		}
		else {
			$(song).hide();
		}
	});
}
var showfilter = function() {
	$('.pl-v3-filter').toggle().find('input').focus();
}
var removeplaylistsafe = function() {
	var accept = confirm('Are you sure you want to delete this playist? This is not revertable');
	if (!accept) return;
	deleteplaylist($(this).attr('data-url'));
}
var songstripback = function() {
	var songstrip = $(this).nextAll('.v2-song-strip');
	var scrollLeft = $(songstrip).scrollLeft();
	$(songstrip).animate({
		scrollLeft: '-=' + $('#view').width()
	})
}
var songstripforward = function() {
	var songstrip = $(this).next('.v2-song-strip');
	var scrollLeft = $(songstrip).scrollLeft();
	$(this).prev('.v2-song-strip-back').show();
	$(songstrip).animate({
		scrollLeft: '+=' + $('#view').width()
	})
}

var togglePlaylistsv2 = function() {
	$('.v2-playlist-adder').toggle();
}

var toggleScrobbling = function (scrobble) {
	var value = this.checked;
	localStorage.scrobble = value;
}

$(document)
.on('mousedown', 	'body', 							mousedown 			) // Hide search results
.on('mousedown',    '.song',            				select      		) // Selecting tracks
.on('keyup',		'body',								keys				) // Keys
.on('keydown', 		'body',								keysdown 			) // Keys with faster feedback
.on('dblclick',     '.song',            				playSong    		) // Doubleclick to play.
.on('mousedown',    '#seek-bar',         				dragSeek			) // Block autmatic seeking while dragging
.on('mousedown',    '#volume-slider',         			changevolume		) // Like it says... change the volume
.on('click',        '#play',            				resume      		) // Play or resume song.
.on('click',        '#pause',           				pause				) // Pause music.
.on('click',        '#skip',            				skip				) // Skip track. Play next one.
.on('click',        '#rewind',          				rewind				) // Go back to previous track.
.on('mouseover',    '[data-tooltip]',   				tooltip     		) // Show small black tooltips.
.on('keydown',      '#search-field',    				autocomplete		) // Show suggestions when user types into search.
.on('keyup',        '.add-tracks-input',    			addtrack 			) // Show suggestions when user types into search.
.on('click',		'#clear-input',						clearinput  		) // Delete everything in the search field.
.on('click',        '.play-button',     				playSong			) // Play buttons are in track views for instance.
.on('click',		'.library-button',					addtolib			) // Sends a request to the server to save the song.
.on('click',		'.library-remove-button', 			remfromlib			) // Sends a request to the server to remove the song.
.on('click',		'.not-in-library .heart',			addtolib 			) // Inline add to library
.on('click',		'.in-library .heart',				remfromlib 			) // Inline remove from library
.on('click',		'#logout',							logout				) // Logout
.on('contextmenu',	'.song, .queue-song',				rightclick  		) // Allows users to right-click
.on('contextmenu',	'.playlistmenuitem',				playlistmenu 		) // Gives options for playlists.
.on('change',		'.settings input',					setchange			) // New settings were made
.on('click',		'[data-order]',						ordersongs			) // Click on table header to sort songs.
.on('click', 		'.add-all-album',					addalbumtolib		) // Add all tracks to an album
.on('click',		'.findandplay',						findandplay 		) // Searches for a track in the DOM and plays it
.on('click',		'.findandqueue',					findandqueue 		) // Equivalent for 'findandplay' but for queueing
.on('click', 		'.notification .actions span',		hidenotification	) // Close notifications
.on('click',		'.albumhidden-message',				showalbum 			) // Show albums that are only instrumentals or EPs
.on('click',		'.add-new-playlist',				newplaylist 		) // New playlist
.on('click',		'.rename-playlist-button',			renameplaylist 		) // Rename playlist
.on('click', 		'.pl-label[contenteditable]',		suppressrenaming 	) // When you click on a playlist to rename, don't load the playlist
.on('click', 		'.delete-playlist-button',			deleteplaylist 		) // Delete playlist.
.on('click',		'.add-song-to-playlist-button', 	addsongtopl 		) // Add a song to a playlist
.on('click',		'.remove-song-from-playlist-button',remsongfrompl 		) // Remove song from playlist
.on('click', 		'.playlist-privacy',		 		pldropdown 			) // click to reveal privacy options
.on('click', 		'.publish-playlist', 				mkplpublic 			) // Contextmenu option to make playlist public
.on('click', 		'.unpublish-playlist',				mkplprivate 		) // Contextmenu option to make playlist private
.on('click', 		'.make-playlist-newest-at-top',		mkplnwattop 		) // Puts the newest songs at the top of the playlist.
.on('click', 		'.make-playlist-newest-at-bottom',	mkplnwatbottom 		) // Puts the newest songs at the bottom of the playlist.
.on('click', 		'.follow-playlist', 				followplaylist 		) // Follow playlist
.on('click', 		'.unfollow-playlist', 				unfollowplaylist 	) // Unfollow playlist
.on('click',		'.close-notification', 				closenotification 	) // Dismiss popup messages
.on('click', 		'.play-all-songs',					playallsongs 		) // Play all songs button
.on('click', 		'.play-all-songs-in-order', 		playallsongsinorder ) // Play, but don't shuffle songs
.on('hover',		'#search-results-wrapper li',		hoversearchresult 	) // Add visual indicator for search when hovering
.on('click', 		'.show-filter-dropdown[data-trigger]', filterdropdown 	) // Filter dropdown
.on('keydown', 											preventScrolling    ) // Prevent scrolling with arrow keys
.on('click',		'[data-trigger]',					trigger 			) // Slide down functionality
.on('click', 		'[data-untrigger]', 				untrigger 			) // Reverse function of trigger
.on('click', 		'#start-queue', 					startqueue 			) // Start queue
.on('click', 		'#stop-queue', 						stopqueue 			) // Stop queue
.on('change', 		'#playlist-target', 				pltargetchanged 	) // Playlist target changed
.on('click', 		'.radio-skip',						skip 				) // Skip button on the radio.
.on('click',		'.start-radio-from-song',			startradiosong 		) // Option in contextmenu that is used to trigger radio start.
.on('click',		'.radio-station',					radiostation 		) // Change radio station
.on('click', 		'#nowplaying-images',				jumptorepresents 	) // Go to the list that is currently playing
.on('click', 		'.report-page-video', 				reportselect		) // Select a video from /report/:id
.on('click', 		'.report-submit', 					reportsubmit 		) // Submit a wrong video button
.on('click',		'.search-result',					searchresult 		) // Hide search results
.on('click', 		'.queue-prev', 						prevQueue 			) // Previous queue
.on('click', 		'.queue-next', 						nextQueue 			) // Next queue
.on('dblclick',		'.sidebar-has-tracks', 				doubleclickPlaylist ) // Enable doubleclick on
.on('mousedown', 	'#search-field, #clear-input',		searchfocused 		) // Show search bar
.on('click', 		'.wikipedia-description',			togglewikicollapse 	) // Toggle Wikipedia description
.on('click', 		'.song-page-edit-metadata', 		editmetadata 		) // Click on "Edit metadata" on song page
.on('click',		'.song-page-submit-metadata', 		submitmetadata 		) // Click "Save button" when editing metadata
.on('input', 		'#register-username-input', 		checkusername 		) // Check if username is available if user has to select one.
.on('click', 		'.send-username', 					sendusername 		) // User has selected username
.on('submit', 		'.register-form', 					register		 	) // New user! Hooray!
.on('submit', 		'.login-form', 						login 				) // Returning user! Welcome back
.on('click', 		'.add-multiple-to-library', 		addmultiple 		) // Add more than one track to the library via contextmenu
.on('click', 		'.remove-multiple-from-library', 	removemultiple 		) // Remove multiple from library via contextmenu
.on('click', 		'.remove-multiple-from-playlist', 	plremovemultiple 	) // Remove multiple from playlist via contextmenu
.on('click',		'#nowplaying-speaker-icon', 		volumecontrol 		) // Volume control
.on('click', 		'.play-list', 						playList 			) // Play a list, e.g. /charts
.on('click', 		'.submit-ones li', 					changeSubmitSub 	) // User decided which sub he wanted to submit to
.on('click', 		'.submit-types li', 				changeSubmitType 	) // User decided which type he wanted to submit - song, playlist or story
.on('click', 		'.submit-submit',					submitpost 			) // Forum entry created
.on('click',		'.change-language',					changeLang 			) // Change language
.on('click', 		'.submit-song-select-another', 		selectAnother 		) // User decided to submit another song
.on('click', 		'.upvote-post', 					upvotePost 			) // You know what it does
.on('click', 		'.downvote-post', 					downvotePost 		) // This too
.on('click', 		'.upvote-comment', 					upvoteComment 		) // Yes, we have comments
.on('click', 		'.downvote-comment', 				downvoteComment 	) // and you can downvote them
.on('click', 		'.submit-playlist-element', 		selectSubmitPlaylist) // Select submit playlist
.on('click',		'.submit-comment', 					submitcomment 		) // Community you know
.on('click', 		'.reply-to-comment', 				showreplyfield 		) // Show reply textarea
.on('click', 		'.delete-comment',					deletecomment 		) // Delete comment you wrote yourself
.on('click', 		'.delete-post', 					deletepost 			) // No lawsuit required, you decide if your stuff get removed
.on('click', 		'.minify', 							minify 				) // Collapse comments
.on('click', 		'.maximize', 						maximize 			) // Decollapse comments
.on('click', 		'#backdrop',						hideBackdrop 		) // Hide that black thing
.on('click',		'.markdown a[href]', 				openInNewTab 		) // Markdown target="_blank"
.on('dblclick',		'.queue-entry', 			        skipToSong 		    ) //User can skip to song in queue
.on('click',		'.markdown-label',					openInNewTab		) // Show/hide formatting help box
.on('focus',		'.song-picker-activator input',		showSongPicker 		) // Show song picker
.on('blur', 		'.song-picker-activator input', 	hideSongPicker 		) // Hide song picker
.on('mouseover', 	'.song-picker-object', 				songPickerHover 	) // Hover over a song picker entry
.on('mousedown', 	'.song-picker-object', 				songPickerClick 	) // Select the track and add it to Playlist/Library
.on('click',		'.playlist-more-button',			plmorebutton 		) // Show playlist menu
.on('click',		'.playlist-add-button',				pladdbutton 		) // Show playlist menu
.on('input', 		'.pl-v3-filter input', 				plfilter 			) // Playlist Filter
.on('click', 		'.playlist-search-button',			showfilter 			) // Same as above, but triggered by click on button
.on('click', 		'.v3-rename-playlist', 				renameplaylistinline) // Another way to rename a playlist
.on('click',		'.v3-delete-playlist', 				removeplaylistsafe  ) // Remove playlist with asking before
.on('click', 		'.v2-song-strip-back', 				songstripback		) // Song strip back
.on('click', 		'.v2-song-strip-forward', 			songstripforward	) // Song strip forward
.on('click', 		'.v2-song-page-playlists', 			togglePlaylistsv2 	) // Song page - reveal playlists
.on('change', 		'.toggle-scrobbling',				toggleScrobbling 	) // Enable or disable scrobbling
$(window)
.on('beforeunload', 									warnexit			) // Warn before exit (Only when user set it in settings!
.on('keydown', function(e) {
	if (!$(document.activeElement).is('input') && !$(document.activeElement).is('[contenteditable]') && !$(document.activeElement).is('textarea')) {
		return !(e.keyCode == 32);
	}
});
/*
	When new tracks are in the DOM, there are some things we should do on the client-side...
*/
var youtubeinit = function() {
	var tag = document.createElement('script');
	tag.src = "https://www.youtube.com/iframe_api";
	var firstScriptTag = document.getElementsByTagName('script')[0];
	firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}
$(document).ready(function() {
	$.subscribe('new-tracks-entered-dom', function() {
		var unrecognized = $('.song.not-recognized');
		recognition.queue.clear();
	    _.each(unrecognized, function(track) {
	    	recognition.queue.push(track);
		});
		var nowPlaying = player.nowPlaying.get();
		if (nowPlaying) {
			var song = $('.song[data-id="' + nowPlaying.id + '"]')
			song.addClass('now-playing');
			if (ytplayer.getPlayerState && ytplayer.getPlayerState() == 1) {
				song.addClass('hearable')
				oneTune.hearable(true);
			}
		}
	});
	$.subscribe('speaker-icon-entered-dom', function() {
		displaySpeaker();
	});
	$.subscribe('view-gets-loaded', function() {
		$('#view').addClass('view-loading');
	});
	$.subscribe('view-got-loaded', function() {
		$('#view').removeClass('view-loading');
	});
	$.subscribe('radio-enabled', function() {
		$('body').addClass('radio-mode');
		chinchilla.radio_mode = true;
	})
	$.subscribe('radio-disabled', function() {
		$('body').removeClass('radio-mode');
		chinchilla.radio_mode = false;
	});
	$.subscribe('queue-changed', function() {
		queues.showSidebar();
		player.saveQueQue();
	});
	sync.syncYoutubeTracks();
	queues.showSidebar();
	youtubeinit();

	$('#view').on('scroll',	viewScrolled);
});
