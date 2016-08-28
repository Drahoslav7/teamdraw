var crypto = require("./crypto");


/**
 * user rights
 */
global.TO_SEE = 1<<0;
global.TO_DRAW = 1<<1;
global.TO_CHANGE_RIGHTS = 1<<2;

var users = {};

function User(secret) {

	var _secret;
	var _rights = TO_SEE | TO_DRAW;

	if (secret && (secret in users)) {
		return users[secret];
	} else {
		_secret = crypto.genSecret();
		this.nick = undefined;
		this.online = undefined;

		users[_secret] = this;
	}


	this.getSecret = function () {
		return _secret;
	};

	this.hasRight = function (right) {
		return !!(_rights & right);
	};
	this.addRight = function (right) {
		_rights |= right;
	}
	this.removeRight = function (right) {
		_rights &= ~right;
	}

	this.setRights = function (rights) {
		_rights = rights;
	}
	this.getRights = function () {
		return _rights;
	}

	this.toJSON = function () {
		return {
			nick: this.nick,
			secret: _secret,
			rights: _rights,
			online: this.online,
		};
	};
}

module.exports = User;