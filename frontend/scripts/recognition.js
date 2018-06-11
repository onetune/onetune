/* global DB */
/* global _s */
/* global _ */
/* global helpers */
/// <reference path="../../typings/jquery/jquery.d.ts"/>
/* global recognition */
var recognitionAdditionHandler = function() {
	if (recognition.started == false) {
		recognition.start();
	}
};
recognition = {
	recognizeAlbum: function(album) {
		var tracks = $(album).find(".album-tracks table tbody tr.song.not-recognized");
		$.each(tracks, function(k,v) {
			recognition.queue.push(v);
		});
	},
  recognizeTrackList: function(list) {
    var tracks = $(list).find("tr.song.not-recognized");
    $.each(tracks, function(k,v) {
      recognition.queue.push(v);
    });
  },
	queue: new EventedArray(recognitionAdditionHandler),
	recognizeTrack: function(obj) {
		var track = obj.track,
			  cb	  = obj.cb;
		var song = helpers.parseDOM(track),
            firsttrackinarray = (track.length != undefined && track.length != 0) ? track[0] : track,
            dom   = (firsttrackinarray instanceof HTMLElement) ? $(firsttrackinarray) : $(".song[data-id=" + firsttrackinarray.id + "]")[0];
        if ($(dom).hasClass('recognized')) {
            cb();
            return;
        }
		recognition.findVideo(song, function (video) {
            if (video) {
                /*
                    Mark it as recognized
                */
                var div = $('.song[data-id="' + song.id + '"]').attr("data-ytid", video.basic.id.videoId);
                div.addClass("recognized").removeClass("not-recognized pending");
                song.ytid = video.basic.id.videoId;
                recognition.uploadTrack(song, video);
            }
            else {
                $(dom).addClass('no-video-found');
            }
            cb();
		});
	},
	started: false,
	start: function() {
		recognition.started = true;
		var loop = function() {
			recognition.recognizeTrack({track: recognition.queue.getArray()[0], cb: function() {
                    if (recognition.started) {
                        recognition.queue.shift();
                        if (recognition.queue.getArray().length == 0) {
                            recognition.stop();
                        }
                        else {
                            loop();
                        }
                    }

				}
			});
		};
		loop();
	},
	stop: function() {
		recognition.started = false;
	},
	findVideo: function (song, callback, jquery, underscore, underscorestring, options) {
        if (jquery != undefined) {
            $ = jquery;
        }
        if (underscore != undefined) {
            _ = underscore;
        }
        if (underscorestring != undefined) {
            _s = underscorestring;
        }
        song.name = (song.title == undefined) ? song.name : song.title;
        var data = {
            part: "snippet",
            key: "AIzaSyCCRAemuZXM6GwYQWXOQI1e4kMnB57LtX0",
            maxResults: 15,
            videoEmbeddable: true,
            type: "video",
            q: song.artist + " " + song.name,
        };
        if (options != undefined && _.contains(options, 'restricted')) {
            data.regionCode = 'DE';
        }
        $.ajax({
            url: "https://www.googleapis.com/youtube/v3/search",
            data: data,
            success: function (json) {
                var ids = _.map(json.items, function (video) {
                    return video.id.videoId;
                });
              return $.ajax({
                url: "https://www.googleapis.com/youtube/v3/videos",
                data: {
                    key: "AIzaSyCCRAemuZXM6GwYQWXOQI1e4kMnB57LtX0",
                    maxResults: 15,
                    part: "contentDetails,statistics",
                    id: ids.join(",")
                },
                success: function(data) {
                    var results = [];
                    for (var i = 0; i < json.items.length; i++) {
                        results.push({
                            basic: json.items[i],
                            advanced: data.items[i]
                        });
                    }
                    recognition.findBestVideo(results, song, function (video) {
                      callback(video);
                    }, _, _s, options);
                }
              });
            }
          }
        );
    },
    findBestVideo: function (json, song, callback, _, _s, options) {
        var videos = json,
            mostviewed =
                _.max(videos, function (video) {
                    return parseInt(video.advanced.statistics.viewCount);
                });
            if (!mostviewed) { callback(null); return; }
            var mostviews = mostviewed.advanced.statistics.viewCount;
        if (typeof localStorage != 'undefined') {
            helpers.localStorageSafety('banned_videos');
            var banned_videos = JSON.parse(localStorage.banned_videos);
            videos = _.reject(videos, function(video) { return _.contains(banned_videos, video.basic.id.videoId); });
        }
        _.map(videos, function (video) {

            /*
                Every video can score between 0 and 1000 points
            */
            video.points = 0;
            var videotitle      = _s.slugify(video.basic.snippet.title),
                format1         = _s.slugify(song.artist + ' ' + song.name);

            /*
                300 Points: Levenshtein distance
            */
            var vtfragments     = helpers.titleMatcher(video.basic.snippet.title, _),
                vtitle          = vtfragments.join(' '),
                tfragments      = helpers.titleMatcher(song.artist + ' ' + song.name, _),
                matches = [], unmatches = [];
            _.each(tfragments, function (fragment) {
                var index = vtitle.indexOf(fragment);
                if (index == -1) {
                    unmatches.push(fragment);
                }
                else {
                    matches.push(fragment);
                    vtitle = vtitle.replace(fragment, '');
                }
            });
            var levpoints = 300*(matches.length/tfragments.length) - vtitle.replace(/\s/g, '').length*2;
            levpoints = (levpoints < 0) ? 0 : levpoints;
            video.points += levpoints;

            /*
                Infinite minus Points: Duration
                -1 less or more is okay
                -For every another second, take away 5 points
            */
            var videoduration   = helpers.parseNewYTTime(video.advanced.contentDetails.duration),
                songduration    = song.duration/1000,
                difference      = Math.abs(videoduration - songduration),
                minuspoints     = difference === 0 ? 0 : (difference-1),
                durpoints       = minuspoints;
            video.points -= durpoints;
            /*
                50 Points: View count
                -Best video gets 50 Points
                -All the other videos get 50 points divided by the ratio of views they have.
            */
            var viewCount       = parseInt(video.advanced.statistics.viewCount),
                ratio           = viewCount / mostviews,
                viepoints       = Math.ceil(ratio*50);
            video.points += viepoints;

            /*
                150 Points: Rating
                -100% positive rating gets 150 points
                -100% negative rating gets 000 points
            */
            var likes = parseInt(video.advanced.statistics.likeCount);
            var dislikes = parseInt(video.advanced.statistics.dislikeCount);
            if ((likes + dislikes) > 0) {
                var rating          = likes / (likes + dislikes),
                    ratpoints       = Math.ceil(rating * 150);
                video.points += ratpoints;
            }

            /*
                200: Bad words
                -200 points if no bad words included
                -minus 75 points for every bad word

            */
            video.points += 200;
            var badwords = ["cover", "parod", "chipmunk", "snippet", "preview", "live", "review", "vocaloid", "dance", "remix"];
            _.each(badwords, function (word) {
                if (_s.include(videotitle.toLowerCase(), word) && !_s.include(format1, word)) {
                    video.points -= 75;
                }
            });

            /*
                -300: Date
            */



            /*
                Album name included
                -If track is a skit / intro / outro, take away 50 points if there is no album name
            */
            video.points += 50;
            if (_s.include(videotitle.toLowerCase()), song.album && (_s.include(format1, 'skit') || _s.include(format1, 'intro') || _s.include(format1, 'outro')) ) {
                video.points -= 50;
            }
        });
        var videos_sorted = _.sortBy(videos, function(video) { return video.points; }).reverse();
        var bestvideo = _.first(videos_sorted);
        if (bestvideo) {
            console.log('The best video has ', bestvideo.points, ' points!', song.name);
        }
        if (options && options.all_videos) {
            callback(videos_sorted);
        }
        else {
            callback(bestvideo);
        }
    },
    uploadTrack: function(track, video) {
    	var videoid = video.basic.id.videoId;
    	var json = track;
    	json.ytid = videoid;
        json.id = json.id + '';
        $.ajax({
            url: '/api/new-ytid',
            dataType: 'json',
            data: json
        });
        DB.addYTIDToTrack(track ,videoid);
    }
};
function EventedArray(handler) {
   this.stack = [];
   this.mutationHandler = handler || function() {};
   this.setHandler = function(f) {
      this.mutationHandler = f;
   };
   this.callHandler = function() {
      if(typeof this.mutationHandler === 'function') {
         this.mutationHandler();
      }
   };
   this.push = function(obj) {
      this.stack.push(obj);
      this.callHandler();
   };
   this.shift = function() {
   	  this.stack.shift();
   };
   this.pop = function() {
      return this.stack.pop();
   };
   this.getArray = function() {
      return this.stack;
   };
   this.unshift = function(obj) {
    this.stack.unshift(obj);
    this.callHandler();
   };
   this.clear   = function() {
    this.stack = [];
    recognition.stop();
   };
}
/*
    For backend
*/
this.recognition = recognition;