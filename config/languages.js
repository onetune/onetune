var cookies = require('cookies');
var _ = require('underscore');
exports.supported_languages = ['en', 'pt', 'de'];
exports.getLanguage = function (request, response) {
	var cookie = new cookies(request, response);
	var lang = cookie.get('lang');
	if (!lang || !_.contains(exports.supported_languages, lang)) {
		cookie.set('lang', 'en', {expires: new Date(2030, 10, 1, 1, 1, 1, 1), httpOnly: false});
		return 'en';
	}
	return lang;
}
exports.setLanguage = function (lang, request, response) {
	var cookie = new cookies(request, response);
	cookie.set('lang', lang, {expires: new Date(2030, 10, 1, 1, 1, 1, 1), httpOnly: false})
}