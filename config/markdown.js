var markdown = require('markdown').markdown;
var _ = require('underscore');
var db = require('../db/queries');

exports.convertToHTML = function (md) {
	return markdown.toHTML(md);
}
exports.convertCommentsToHTML = function(comments) {
	return _.map(comments, function (comment) {
		if (!comment.content) {
			comment.html = '<p class="deleted_comment">[This comment was deleted.]</p>'
		}
		else {
			comment.html = exports.convertToHTML(comment.content);
		}
		return comment;
	});
}
exports.addInlinesToHTML = function(html, callback) {
	var getPostSongLinks = function(matches) {
		var ids = _.map(matches, function (m) { return m.replace('[[song ', '').replace(']]', '') });
		db.getSongsByIdList(ids, function (results) {
			_.each(results, function (result) {
				var replregex = new RegExp('\\[\\[song '+ result.id +'\\]\\]', 'g');
				html = html.replace(replregex, '<a class="inline-song" data-navigate="/song/' + result.id + '"><img src="' + result.image + '">' + result.name +' - ' + result.artist + '</a>');
			});
			afterPostSongLinksReplaced();
		});
	}
	var afterPostSongLinksReplaced = function() {
		callback(html);
	}

	var matches = _.uniq(html.match(/\[\[song [0-9]+\]\]/g));
	if (matches.length > 0) {
		getPostSongLinks(matches);
	}
	else {
		afterPostSongLinksReplaced();
	}
}