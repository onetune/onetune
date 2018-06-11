views = {
	artist: {
		load: function(artist) {
			$.ajax({
				url: "/api/artist/" + artist,
				dataType: "html",
				success: function(data) {
					$("#view[data-route='/artist/" + artist + "']").html(data);
					views.loadingindicator.hide()
					$.publish('/artist/' + artist + '/loaded');
					$.publish('new-tracks-entered-dom');
					$.publish('view-got-loaded')

				},
				error: function() {
					errors.draw(404);
				}
			})
		}
	},
	song: {
		load: function(song) {
			DB.getTracks({
				ids: [song],
				callback: function (local) {
					var afterTrackFound = function (_song) {
						$("#view[data-route='/song/" + song + "']").html(templates.buildSongPage(_song))
						views.loadingindicator.hide();
						$.publish('new-tracks-entered-dom');
						$.publish('/song/' + song + '/loaded');
						$.publish('view-got-loaded')
					}
					if (local.length > 0) {
						afterTrackFound(local[0])
					}
					else {
						$.ajax({
							url: '/api/song/' + song,
							dataType: 'json',
							success: function(data) {
								if (!data.success) {
									errors.draw(data.error);
									return;
								}
								afterTrackFound(data.song);
								DB.addTrack(data.song);
							},
						});
					}
				}
			});
		}
	},
	newsong: function(id) {
		$("#view").html(templates.buildNewSongPage());
		ko.cleanNode(document.getElementById('view'))
		ko.applyBindings(new SongPage(id), document.getElementById('view'))
		views.loadingindicator.hide();
	},
	album: {
		load: function(id) {
			$.ajax({
				url: "/api/album/" + id,
				dataType: "html",
				success: function(data) {
					var view = $("#view[data-route='/album/" + id + "']");
					view.html(data);
					views.loadingindicator.hide();
					$.publish('/album/' + id + '/loaded');
					$.publish('new-tracks-entered-dom');
					$.publish('view-got-loaded')
				},
				error: function() {
					errors.draw(404);
				}
			})
		}
	},
    charts: {
        load: function() {
			$.ajax({
				url: "/api/charts",
				dataType: "html",
				success: function(data) {
					var view = $("#view[data-route='/charts']");
					view.html(data);
					views.loadingindicator.hide();
					$.publish('/charts/loaded');
					$.publish('new-tracks-entered-dom');
					$.publish('view-got-loaded')
				},
				error: function() {
					errors.draw(404)
				}
			});
		},
		loadGenre: function (match) {
			$.ajax({
				url: "/api/" + match + "/charts",
				dataType: "html",
				success: function (data) {
					var view = $("#view[data-route='/one/" + match + "/charts']");
					view.html(data);
					views.loadingindicator.hide();
					$.publish('/one/' + match + '/charts/loaded');
					$.publish('new-tracks-entered-dom');
					$.publish('view-got-loaded');
				},
				error: function () {
					errors.draw(404);
				}
			});
		}
	},
	redditdetail: {
		load: function(match) {
			$.ajax({
				url: '/api/r/' + match,
				dataType: 'html',
				success: function(data) {
					var view = $('#view[data-route="/r/'+match+'"]');
					view.html(data);
					views.loadingindicator.hide();
					$.publish('/r/' + match + '/loaded')
					$.publish('/new-tracks-entered-dom');
					$('view-got-loaded');
				},
				error: function() {
					errors.draw(404);
				}
			});
		}
	},
	retrocharts: {
		load: function(year) {
			$.ajax({
				url: "/api/charts/" + year,
				dataType: "html",
				success: function(data) {
					var view = $("#view[data-route='/time-machine/" + year + "']");
					view.html(data);
					views.loadingindicator.hide();
					$.publish('/retro-charts/' + year + '/loaded')
					$.publish('new-tracks-entered-dom');
					$.publish('view-got-loaded')
				}
			})
		}
	},
	info: {
		load: function() {
			$.ajax({
				url: "/api/info",
				dataType: "html",
				success: function(data) {
					var view = $("#view[data-route='/info']");
					view.html(data);
					views.loadingindicator.hide();
					$.publish('view-got-loaded')
				},
				error: function() {
					errors.draw(404);
				}
			});
		}
	},
	sway: {
		load: function() {
			$.ajax({
				url: "/api/sway",
				dataType: "html",
				success: function(data) {
					var view = $("#view[data-route='/sway']");
					view.html(data);
					views.loadingindicator.hide();
					$.publish('view-got-loaded')
				},
				error: function() {
					errors.draw(404);
				}
			});
		}
	},
	loadingindicator: {
		hide: function() {
			$('#view,#loading-indicator').removeClass('loading-indicator-visible');
			$('#view').scrollTop(0)
		}
	},
	library: {
		load: function() {
			var library = oneTune.library(),
				data = {user: chinchilla.loggedin},
				afterLocalTracksFetched = function(data) {
					var fetched = data;
					var tofetch = _.difference(library, _.pluck(fetched, 'id'));
					if (tofetch.length != 0) {
						$('#view[data-route="/library"]').html("");
						showSpinner();
						$.ajax({
							url: '/api/tracks/get',
							data: {tracks: tofetch},
							dataType: 'json',
							success: function (response) {
								var alltracks = _.union(response.tracks, fetched);
								afterAllTracksFetched(alltracks);
								_.each(response.tracks, function (track) {
									DB.addTrack(track)
								})
							}
						});
					}
					else {
						afterAllTracksFetched(fetched);
					}
				},
				afterAllTracksFetched 		= function(tracks) {
					data.tracks = (helpers.sortTracks(library, tracks)).reverse();
					var html = templates.buildLibrary(data);
					$('#view[data-route="/library"]').html(html).scrollTop(0);
					views.loadingindicator.hide();
					$.publish('/library/loaded');
					$.publish('new-tracks-entered-dom');
					$.publish('view-got-loaded');
				}
			DB.getTracks({ids: library, callback: afterLocalTracksFetched});
		}
	},
	/*user: {
		load: function (username) {
			$.ajax({
				url: '/api/u/' + username,
				dataType: 'json',
				success: function (data) {
					var view = $('#view');
					view.html(data);
					views.loadingindicator.hide();
					$.publish('view-got-loaded');
				}
			});
		}
	},*/
	user: {
		load: function(username) {
			$.ajax({
				url: '/api/u/' + username,
				dataType: 'json',
				data: {token: chinchilla.token},
				success: function (data) {
					if (data.success) {
						data.username = username;
						userpage.buildHomePage(data);
					}
				},
				error: function() {
					errors.draw(404);
				}
			});
		}
	},
	playlistsplash: {
		load: function() {
			views.library.load();
		}
	},
	playlist: {
		load: function(url) {
			var playlist = _.where(oneTune.playlists(), {url: url})[0],
				data = {user: chinchilla.loggedin, playlist: playlist},
				afterLocalTracksFetched = function(data) {
					var fetched = data;
					var tofetch = _.difference(playlist.tracks, _.pluck(fetched, 'id'));
					if (tofetch.length != 0) {
						$('#view[data-route="'+url+'"]').html("");
						showSpinner();
						$.ajax({
							url: '/api/tracks/get',
							data: {tracks: tofetch},
							dataType: 'json',
							success: function (response) {
								var alltracks = _.union(response.tracks, fetched);
								var alltracksmapped = _.map(alltracks, function(track) { track.inlib = _.contains(oneTune.library(), track.id + ''); return track });
								afterAllTracksFetched(alltracksmapped);
								_.each(response.tracks, function (track) {
									DB.addTrack(track)
								});
							}
						});
					}
					else {
						afterAllTracksFetched(fetched);
					}
				},
				afterAllTracksFetched 	= function(tracks) {
					data.tracks = (helpers.sortTracks(playlist.tracks, tracks))
					if (!data.playlist.followercount) {
						data.playlist.followercount = 0;
					}
					if (playlist.newestattop) { data.tracks = data.tracks.reverse(); };
					var html = templates.buildPlaylist(data);
					$('#view[data-route="'+url+'"]').html(html).scrollTop(0);
					if (!data.playlist.style) {
						colors.getMostCommon(playlist.url);
					}
					views.loadingindicator.hide();
					$.publish(url + '/loaded');
					$.publish('new-tracks-entered-dom');
					$.publish('view-got-loaded')
				}
			if (playlist) {
				DB.getTracks({ids: playlist.tracks, callback: afterLocalTracksFetched});
			}
			else {
				$('#view[data-route="'+url+'"]').html("");
				showSpinner();
				$.ajax({
					url: '/api/playlists/get-tracks',
					dataType: 'json',
					data: {playlist: url, token: chinchilla.token},
					success: function(response) {
						if (!response.success) {
							$.ajax({
								url: '/api/error/502',
								dataType: 'html',
								success: function(data) {
									var view = $('#view');
									view.html(data);
									views.loadingindicator.hide();
									$.publish('view-got-loaded');
								}
							})
						}
						else {
							playlist = response.playlist;
							data.playlist = response.playlist;
							oneTune.playlists.push(playlist);
							DB.getTracks({ids: response.playlist.tracks, callback: afterLocalTracksFetched});
						}
					}
				});
			}
		}
	},
	lyrics: {
		load: function(id) {
			$.ajax({
				url: '/api/lyrics/' + id,
				dataType: 'html',
				success: function(data) {
					var view = $('#view[data-route="/lyrics/' + id + '"]');
					view.html(data);
					views.loadingindicator.hide();
					$.publish('view-got-loaded')
				}
			})
		}
	},
	redditpl: {
		load: function(id) {
			$.ajax({
				url: '/api/thread/' + id,
				dataType: 'html',
				success: function(data) {
					var view = $('#view[data-route="/thread/'+id+'"]');
					view.html(data);
					views.loadingindicator.hide();
					$.publish('/thread/' + id + '/loaded');
					$.publish('view-got-loaded');
					$.publish('new-tracks-entered-dom');
				}
			})
		}
	},
	services: {
		load: function(id) {
			$.ajax({
				url: '/api/services/',
				dataType: 'html',
				success: function(data) {
					var view = $('#view[data-route="/services"]');
					view.html(data);
					views.loadingindicator.hide();
					$.publish('/services');
					$.publish('view-got-loaded');
				}
			})
		}
	},
	reddit: {
		load: function() {
			$.ajax({
				url: "/api/genres",
				dataType: "html",
				success: function(data) {
					var view = $("#view[data-route='/genres']");
					view.html(data);
					views.loadingindicator.hide();
					$.publish('/genres/loaded');
					$.publish('new-tracks-entered-dom');
					$.publish('view-got-loaded')
				},
				error: function() {
					errors.draw(404);
				}
			})
		}
	},
	settings: {
		get: function() {
			$.ajax({
				url: "/api/settings",
				dataType: "html",
				success: function(data) {
					$("#view[data-route='/settings']").html(data);
					views.loadingindicator.hide();
					$.publish('view-got-loaded')
				},
				error: function() {
					errors.draw(404);
				}
			})
		}
	},
	main: {
		get: function() {
			$("#view").html(templates.buildHome());
			ko.cleanNode(document.getElementById('view'))
			ko.applyBindings(new HomeView(), document.getElementById('view'))
			views.loadingindicator.hide();
			$.publish('new-tracks-entered-dom');
			$.publish('view-got-loaded');
		}
	},
	home: {
		get: function() {
			var data = {};
			var afterDataFetched = function() {
				if (chinchilla.loggedin) {
					DB.getTracks({
						ids: oneTune.library(),
						callback: function (tracks) {
							data.library = (helpers.sortTracks(oneTune.library(), tracks)).reverse();
							render();
						}
					});
				}
				else {
					render();
				}
			}
			var render = function() {
				homepage.build(data);
			}
			$.ajax({
				url: '/api/homepage',
				data: {token: chinchilla.token, date: Date.now() },
				dataType: 'json',
				success: function (json) {
					data = json;
					afterDataFetched();
				}
			});
		}
	},
	remote: {
		get: function() {
			$.ajax({
				url: '/api/remote',
				dataType: 'html',
				success: function(data) {
					$('#view[data-route="/remote"]').html(data);
					views.loadingindicator.hide();
					$.publish('view-got-loaded');
				},
				error: function() {
					errors.draw(404);
				}
			});
		}
	},
	report: {
		load: function(match) {
			$.ajax({
				url: '/api/report/' + match,
				dataType: 'html',
				success: function (data) {
					$('#view[data-route="/report/' + match + '"]').html(data);
					views.loadingindicator.hide();
					$.publish('view-got-loaded');
				},
				error: function() {
					errors.draw(404);
				}
			})
		}
	},
	select_username: {
		load: function(match) {
			$.ajax({
				url: '/api/select_username/' + match,
				dataType: 'html',
				success: function (data) {
					$('#view[data-route="/select_username/'+match+'"]').html(data);
					views.loadingindicator.hide();
					$('#view-got-loaded');
				},
				error: function() {
					errors.draw(404)
				}
			})
		}
	},
	subs: {
		load: function() {
			$.ajax({
				url: "/api/one",
				dataType: "html",
				success: function(data) {
					$("#view[data-route='/one']").html(data);
					views.loadingindicator.hide();
					$.publish('view-got-loaded')
				},
				error: function() {
					errors.draw(404);
				}
			})
		}
	},
	one: {
		load: function(match) {
			$.ajax({
				url: '/api/one/' + match,
				dataType: 'json',
				data: {token: chinchilla.token, time: Date.now()},
				success: function (data) {
					if (data.success) {
						one.buildHomePage(data);
						$.publish('new-tracks-entered-dom')
					}
				},
				error: function() {
					errors.draw(404);
				}
			});
		}
	},
	register: {
		load: function() {
			$.ajax({
				url: '/api/register/',
				dataType: 'html',
				success: function (data) {
					$('#view[data-route="/register"]').html(data);
					views.loadingindicator.hide();
					$.publish('view-got-loaded');
				},
				error: function() {
					errors.draw(404)
				}
			})
		}
	},
	submit: {
		load: function(sub, entity, id) {
			$.ajax({
				url: '/api/submit',
				dataType: 'html',
				data: {
					sub: sub,
					entity: entity,
					id: id
				},
				success: function (data) {
					$('#view').html(data);
					views.loadingindicator.hide();
					$.publish('view-got-loaded');
				},
				error: function() {
					errors.draw(404);
				}
			});
		}
	},
	posts: {
		load: function(sub, post) {
			$.ajax({
				url: '/api/community/post' + window.location.search,
				data: {
					sub: sub,
					post: post
				},
				dataType: 'html',
				success: function (data) {
					$('#view').html(data);
					views.loadingindicator.hide();
					$.publish('view-got-loaded');
					$.publish('new-tracks-entered-dom')
				}
			});
		},
		loadList: function(sub, type) {
			$.ajax({
				url: '/api/' + (sub ? (sub + '/') : '') + type + window.location.search,
				dataType: 'html',
				success: function (data) {
					$('#view').html(data);
					views.loadingindicator.hide();
					$.publish('view-got-loaded');
				}
			});

		}
	},
	privacy: {
		load: function() {
			$.ajax({
				url: '/api/privacy',
				dataType: 'html',
				success: function (data) {
					$('#view[data-route="/privacy"]').html(data);
					views.loadingindicator.hide();
					$.publish('view-got-loaded');
				},
				error: function() {
					errors.draw(404);
				}
			});
		}
	},
	freebase: {
		load: function(track, artist) {
			$.ajax({
				url: 'https://www.googleapis.com/freebase/v1/reconcile?name='+helpers.parseMainText(track.replace(/&#39;/g, '\''))+'&indent=true&kind=/music/recording&prop=/music/recording/artist:'+helpers.parseMainText(artist.replace(/&#39;/g, '\''))+'&key=AIzaSyDYwd_Qaxn79RMKUtFuf7t9u8E4GHKCfm8',
				dataType: 'json',
				success: function(result) {
					console.log(result);
					if (result.candidate && result.candidate.length != 0) {
						var firstresult = result.candidate[0];
						if (firstresult.confidence > 0.5) {
							views.freebase.loadRecording(firstresult)
						}
						else {
							views.freebaseerror.make();
						}
					}
					else {
						views.freebaseerror.make();
					}
				},
				error: function() {
					views.freebaseerror.make()
				}
			});
		},
		loadRecording: function(freebase_object) {
			$.ajax({
				url: 'https://www.googleapis.com/freebase/v1/topic' + freebase_object.mid,
				dataType: 'json',
				success: function(result) {
					if (!result || !result.property['/music/recording/song']) {
						views.freebaseerror.make(); return;
					}
					views.freebase.loadSong(result.property['/music/recording/song'].values[0]);
				},
				error: function() {
					views.freebaseerror.make();
				}
			});
		},
		loadSong: function(freebase_object) {
			$.ajax({
				url: 'https://www.googleapis.com/freebase/v1/topic' + freebase_object.id,
				dataType: 'json',
				success: function(result) {
					var fb_view = $('.song-page-wikipedia').empty();
					var props = result.property;
					fb_view.append('<h2>About this song</h2>')
					if (props['/common/topic/description'] && props['/common/topic/description'].values.length != 0) {
						var citation = props['/common/topic/description'].values[0].citation
						fb_view.append(
							templates.buildFreebase(
								'wikipedia-description wiki-collapsed',
								'Description',
								props['/common/topic/description'].values[0].value,
								citation ? citation.provider : null,
								citation ? citation.uri : null
							)
						);
					}
					if (props['/music/composition/composer'] && props['/music/composition/composer'].values.length != 0) {
						fb_view.append(
							templates.buildFreebase(
								'freebase-composer',
								'Composers',
								_.pluck(props['/music/composition/composer'].values, 'text').join(', ')
							)
						);
					}
					if (props['/award/award_winning_work/awards_won'] && props['/award/award_winning_work/awards_won'].values.length != 0) {
						fb_view.append(
							templates.buildFreebase(
								'freebase-awards',
								'Awards won',
								_.map(props['/award/award_winning_work/awards_won'].values, function (award) { return award.property['/award/award_honor/award'].values[0].text + ' ' + award.property['/award/award_honor/year'].values[0].text }).join('<br>')
							)
						)
					}
					if (props['/award/award_nominated_work/award_nominations'] && props['/award/award_nominated_work/award_nominations'].values.length != 0) {
						fb_view.append(
							templates.buildFreebase(
								'freebase-nominations',
								'Award nominations',
								_.map(props['/award/award_nominated_work/award_nominations'].values, function (award) { return award.property['/award/award_nomination/award'].values[0].text + ' ' + award.property['/award/award_nomination/year'].values[0].text }).join('<br>')
							)
						)
					}
				},
				error: function() {
					views.freebaseerror.make();
				}
			})
		}
	},
	freebaseerror: {
		make: function() {
			$('.song-page-wikipedia').remove();
		}
	}
};