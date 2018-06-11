remote = {
	updateTrack: function() {
		if (chinchilla.paired) {
			console.log('Paired');
			//socket.emit('/pairing/update-info', { playing: player.nowPlaying.get(), code: chinchilla.paired });
		}
	}
}