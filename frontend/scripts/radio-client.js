radio = {
	showRadioPage: function() {
		$('#view').html(_.template($('#radio-template').html()));
		radio.loadIntoDOM({radio_id: localStorage.current_radio})
	},
	loadIntoDOM: function(data) {
		localStorage.current_radio = data.radio_id;
		$('.album-slider').removeClass('load-tracks');
		var radio = JSON.parse(localStorage['radio'])[data.radio_id];
		$('.radio-album-covers').empty();
		this.addBoxes(radio.history);
		this.addBox(radio.current);
		if (data.instant_start) {
			$('.radio-box[data-id="'+radio.current.id+'"]').find('.visual-play-button').click();
			localStorage.current_radio = data.radio_id;
		}
		$('.radio-type').text(this.typeLabels[radio.type]);
		$('.radio-based').text('based on "' + radio.from.title + '"');
		if (radio.queue.length == 0) {
			//socket.emit('/radio/get-next-tracks', {radio_id: data.radio_id});
			$('.album-slider').addClass('load-tracks');
		}
		$('.radio-stations').empty();
		_.each(JSON.parse(localStorage.radio), this.addStation);
	},
	addBox: function(song, prepend) {
		var boxtoadd = _.template($('#radio-song-template').html(), {data: song});
		$('.radio-album-covers').prepend(boxtoadd)
	},
	addBoxes: function(songs) {
		_.each(songs, this.addBox);
	},
	addStation: function(station) {
		$('.radio-stations').append(_.template($('#radio-station-template').html(), station));
	},
	typeLabels: {
		'song-radio': 'Song Radio'
	}
}
//socket.on('/radio/radio-started', function (data) {
//	helpers.localStorageSafetyObject('radio');
//	var radios = JSON.parse(localStorage['radio']);
//	radios[data.radio_id] = data;
//	localStorage['radio'] = JSON.stringify(radios);
//	navigation.to('/radio');
//	radio.loadIntoDOM({radio_id: data.radio_id, instant_start: true});
//});
//socket.on('/radio/timeout', function (data) {
//	helpers.localStorageSafetyObject('radio');
//	var radios = JSON.parse(localStorage['radio']);
//	delete radios[data.radio_id];
//	localStorage['radio'] = JSON.stringify(radios)
//	notifications.create('The radio session timed out.')
//});
//socket.on('/radio/add-to-queue', function (data) {
//	var afterVideoFound = function(song) {
//		/*
//			Make sure localStorage object exists
//		*/
//		helpers.localStorageSafetyObject('radio');
//		var radios = JSON.parse(localStorage['radio']);
//		/*
//			Add song to queue
//		*/
//		radios[data.radio_id].queue.push(song);
//		/*
//			If the song is the same as the current one playing, don't save it.
//		*/
//		var current = radios[data.radio_id].current
//		if (current && current.id + '' == song.id + '') return;
//		/*
//			If the song just was played, ignore it.
//		*/
//		if (_.contains(_.pluck(radios[data.radio_id].history, 'id'), song.id + '')) {
//			socket.emit('/radio/track-played', {radio_id: localStorage.current_radio})
//			return;
//		};
//		radios[data.radio_id].queue = _.uniq(radios[data.radio_id].queue, function (song) { return song.id + ''});
//		localStorage.radio = JSON.stringify(radios);
//		$('.album-slider').removeClass('load-tracks')
//		if (chinchilla.play_next_radio_track_instantly) {
//			chinchilla.play_next_radio_track_instantly = false;
//			skip();
//		}
//	}
//	if (data.song.ytid) {
//		afterVideoFound(data.song)
//	}
//	else {
//		recognition.findVideo(data.song, function (video) {
//			if (video) {
//				data.song.ytid = video.id.videoId;
//				afterVideoFound(data.song);
//			}
//		})
//	}
//});


;