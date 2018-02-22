const crypto = require("./crypto")

/**
 * user rights
 */
global.TO_SEE = 1<<0
global.TO_DRAW = 1<<1
global.TO_CHANGE_RIGHTS = 1<<2

let users = {}

User.get = function(secret) {
	return users[secret]
}

function User(secret) {

	let _secret
	let _rights = TO_SEE | TO_DRAW

	if (secret && (secret in users)) {
		return users[secret]
	}

	_secret = crypto.genSecret()
	this.nick = undefined
	this.online = undefined

	users[_secret] = this


	this.getSecret = () => _secret

	this.hasRight = (right) => Boolean(_rights & right)

	this.addRight = (right) => { _rights |= right }
	this.removeRight = (right) => { _rights &= ~right }

	this.setRights = (rights) => { _rights = rights	}
	this.getRights = () => _rights

	this.toJSON = () => ({
		nick: this.nick,
		secret: _secret,
		rights: _rights,
		online: this.online,
	})
}

module.exports = User