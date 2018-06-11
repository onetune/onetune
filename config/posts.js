var moment = require('moment');
var _ = require('underscore');
var db = require('../db/queries');
exports.mapSubmissions = function (submissions, user) {
	return _.map(submissions, function (submission) {
		if (user) {
			submission.upvoted = _.contains(submission.upvoters, user.username);
			submission.downvoted = _.contains(submission.downvoters, user.username);
			submission.vote = submission.upvoted ? 1 : (submission.downvoted ? -1 : 0);
		}
		submission.timestamp = moment(submission.date).fromNow();
		var submission = _.pick(submission, 'entity', 'title', 'sub', 'slug', 'url', 'user', 'vote_count', 'comments', 'upvoted', 'downvoted', 'vote', 'timestamp', 'song', 'info', 'playlist', 'thumbnails');
		return submission;
	});
}

exports.getSongsForPosts = function(posts, callback) {
	var posts = posts;
	db.getSongsByIdList(_.pluck(posts, 'song'), function (_songs) {
		posts = _.map(posts, function (post) {
			post.info = _.find(_songs, function (s) {
				return s.id == post.song
			});
			return post;
		});
		callback(posts);
	});
}