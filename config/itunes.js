(function(){

    var parse = JSON.parse;

    JSON = {

        stringify: JSON.stringify,

        validate: function(str){

            try{
                parse(str);
                return true;
            }catch(err){
                return err;
            }

        },

        parse: function(str){

            try{
                return parse(str);
            }catch(err){
                return undefined;
            }

        }
    }

})();



var request = require('request'),
    _       = require('underscore');

exports.search = function(query, options, callback) {

  // https://www.apple.com/itunes/affiliates/resources/documentation/itunes-store-web-service-search-api.html#searching
  // options example:
  // options = {
  //    media: "movie" // options are: podcast, music, musicVideo, audiobook, shortFilm, tvShow, software, ebook, all
  //  , entity: "movie"
  //  , attribute: "movie"
  //  , limit: 50
  //  , explicit: "No" // explicit material
  // }

  var optionsString = "";

  for (item in options) {
    optionsString += "&" + item + "=" + encodeURIComponent(options[item]);
  }

  request("https://itunes.apple.com/search?country=us" + optionsString + "&term=" + encodeURIComponent(query), function(err, response, body) {

    if (body != undefined && !err) {
        callback( JSON.parse(body) );
    }
    else {
      callback(null);
    }
  })

}
exports.lookup = function(id, options, callback) {
  var optionsString = "";

  for (item in options) {
    optionsString += "&" + item + "=" + encodeURIComponent(options[item]);
  }

  request("https://itunes.apple.com/lookup?country=us" + optionsString + "&id=" + encodeURIComponent(id), function(err, response, body) {
    if (body != undefined && !err) {
        callback( JSON.parse(body) );
    }
    else {
      callback(null);
    }
  })
}
exports.getFromItunes = function(ids, callback) {
  var idstring = _.compact(
    _.map(ids, function(id) {
      return id + '';
    })
  ).join(',');
  request("https://itunes.apple.com/lookup?country=us&entity=song&media=music&id=" + idstring, function(err, response, body) {
    if (body != undefined && !err) {
        var json = JSON.parse(body, idstring);
        if (!json) return;
        var tracks = _.map(json.results, function (song) { return exports.remap(song) });
        callback(tracks);
    }
  });
}
// Duplicate method in helpers! Change it there too!
exports.remap = function (track) {
   return {
        name: track.trackName,
		    duration: track.trackTimeMillis,
		    album: track.collectionName,
		    albumid: track.collectionId,
		    artistid: track.artistId,
		    artist: track.artistName,
        image: track.artworkUrl100,
        id: track.trackId,
		    explicit: track.trackExplicitness == "explicit" ? true : false,
		    genre: track.primaryGenreName,
		    numberinalbum: track.trackNumber,
		    cdinalbum: track.discNumber,
		    tracks: track.trackCount,
		    cdcount: track.discCount,
		    preview: track.previewUrl,
		    release: track.releaseDate
	};
}
exports.remapYouTubeNew = function(res) {
  return {
    "artistid": null,
    "albumid": null,
    "id": res.id,
    "artist": res.snippet.channelTitle,
    "album": null,
    "name": res.snippet.title,
    "preview": null,
    "image": res.snippet.thumbnails.default.url,
    "release": res.snippet.publishedAt,
    "explicit": false,
    "cdcount": null,
    "cdinalbum": null,
    "tracks": null,
    "numberinalbum": null,
    "duration": helpers.parseNewYTTime(res.contentDetails.duration),
    "genre": null,
    "ytid": res.id,
    "provider": "youtube"
  }
}
exports.remapYouTube = function(res) {
  return {
    "artistid": null,
    "albumid": null,
    "id": res.id,
    "artist": res.uploader,
    "album": null,
    "name": res.title,
    "preview": null,
    "image": res.thumbnail.hqDefault,
    "release": res.uploaded,
    "explicit": false,
    "cdcount": null,
    "cdinalbum": null,
    "tracks": null,
    "numberinalbum": null,
    "duration": res.duration*1000,
    "genre": null,
    "ytid": res.id,
    "provider": "youtube"
  }
}
