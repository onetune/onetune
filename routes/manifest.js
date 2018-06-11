var _ = require('underscore');
exports.sendManifest = function (request, response) {
	response.setHeader('Content-Type', 'text/cache-manifest');
	var template = [
		'CACHE MANIFEST',
		'/frontend/css/main.css?v=<%= rev%>',
		'',
		'NETWORK:',
		'*'
	].join('\n');
	response.end(_.template(template, {rev: global.OneTune.git_rev}))
}
