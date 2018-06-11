exports.checkIfSongId = function (id) {
	return (new RegExp('^[a-zA-Z0-9_-]+$')).test(id)
}
exports.checkIfiTunesId = function (id) {
	return (new RegExp('^[0-9]+$')).test(id)
}
exports.checkIfValidPlaylistUrl = function(url) {
	return url && url.match(/\//g).length == 4
}
exports.extractUsernameFromPlaylist = function(url) {
	return url.match(/\/u\/([\\a-zA-Z0-9\-_\.]+)\/p\//)[1]
}