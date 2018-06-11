sync = {
	syncYoutubeTracks: function() {
		if (!chinchilla.loggedin) return;
		DB.getAllIds(function(tracks) {
			var lists = _.groupBy(tracks, function(element, index){
			 	return Math.floor(index/150);
			});
			_.each(lists, function (list) {
				$.ajax({
					url: '/api/sync',
					data: {tracks: list.join(','), token: chinchilla.token, lastSync: localStorage.lastSync},
					dataType: 'json',
					success: function (data) {
						if (data.success) {
							console.log('No sync needed.');
						}
						localStorage.lastSync = Date.now()
						if (data.length != 0) {
							DB.putUpdates(data, function (success) {
								console.log(success + ' tracks synced. ' + (data.length-success) + ' failed.');
							});
						}
						else {
							console.log('SYN complete. No tracks were replaced.');
						}
					}
				});
			});
		});
	}
}