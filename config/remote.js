var _ 		= require('underscore');

exports.pairingconnections = [];
exports.getPairing = function (code) {
	return _.where(exports.pairingconnections, {code: code})[0];
}
exports.updatePairing = function(pairing, code) {
	exports.removePairing(code);
	exports.pairingconnections.push(pairing);
}
exports.removePairing = function(code) {
	exports.pairingconnections = _.reject(exports.pairingconnections, function (connection) { connection.code == code });
}