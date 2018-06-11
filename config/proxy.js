/*
	This file proxies iTunes covers for color matching.
*/

var http = require('http'),
	validator = require('validator'),
	_url = require('url');

exports.proxy = function(request, response) {
    if (!validator.isURL(request.query.url)) {
        return response.end('Invalid url.');
    }
    var url = _url.parse(request.query.url);
    if (!url || (!url.hostname.match(/mzstatic.com/) && !url.hostname.match(/ytimg.com/))) {
        return response.end('Domain forbidden.');
    }
    var options = {
        port: 80,
        path: url.path,
        hostname: url.hostname,
        method: 'GET'
    };

    var proxy = http.request(options, function (res) {
        res.pipe(response, {
            end: true
        });
    })
    .on('error', function (hi) {
        response.end('Server has no internet connection.');
    });

    request.pipe(proxy, {
        end: true
    });
}