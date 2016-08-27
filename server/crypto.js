var crypto = require('crypto');

crypto.rand = function(n){
	return Math.floor(Math.random()*n);
}

crypto.genRandomString = function (len, chars) {
	var result = new Array(len);
	var randomBites = this.randomBytes(len);
	for (var i = 0, cursor = 0; i < len; i++) {
		cursor += randomBites[i];
		result[i] = chars[cursor % chars.length];
	};
	return result.join('');
}

crypto.genToken = function () {
	return this.genRandomString(8, "ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789");
}

crypto.genSecret = function () {
	return this.genRandomString(20, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
}


module.exports = crypto;