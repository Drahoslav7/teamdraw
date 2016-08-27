var crypto = require("./crypto");


/**
 * user rights
 */
global.TO_SEE = 1<<0;
global.TO_DRAW = 1<<1;
global.TO_CHANGE_RIGHTS = 1<<2;

function User(secret) {

	var _secret = secret || crypto.genSecret();
	var _rights = TO_SEE | TO_DRAW;

	this.nick = undefined;

	this.getSecret = function () {
		return _secret;
	};
	this.hasRight = function (right) {
		return !!(_rights & right);
	};
	this.setRight = function (right) {
		_rights |= right;
	}
	this.getRights = function () {
		return _rights;
	}
	this.toJSON = function () {
		return {
			nick: this.nick,
			secret: _secret,
			rights: _rights,
		};
	};
}

module.exports = User;