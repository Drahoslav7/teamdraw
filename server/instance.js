const crypto = require("./crypto")
require("./user")

const instances = {}

Instance.get = (token) => instances[token]
Instance.getAll = () => instances

function Instance(io) {
	// private:

	let _actions = [] // this has to be syncing across clients
	let _token // globally unicate identifier of instance
	let _users = [] // collection of obejcts {secret: string, nick: string, rights: number}
	let _creationTime = new Date()

	do {
		_token = crypto.genToken()
	} while(_token in instances)

	instances[_token] = this

	// public:

	this.canUseNick = (user) =>
		!_users.some(otherUser => otherUser.nick === user.nick && user !== otherUser)

	/**
	 * this had to be called once, without nick when creating or joining
	 * @param  {User} user to (re)join
	 * @return {error}        error if some
	 */
	this.join = (user, userSocket) => {
		let alreadyIn = _users.some(otherUser => user === otherUser)
		if (!alreadyIn) {
			_users.push(user)
		}

		userSocket.join(_token)
		user.online = true

		console.log(user.nick, "joined", _token)
		return null
	}

	this.remove = (user) => {
		for (let socketID in io.sockets.connected) {
			let socket = io.sockets.connected[socketID]
			if (socket.user === user) {
				socket.leave(_token)
				socket.disconnect()
			}
		}
		_users = _users.filter(u => u !== user)
	}

	this.destroy = () => {
		_users.forEach((user) => {
			this.remove(user)
		})
		delete instances[_token]
	}

	this.getToken = () => _token

	this.getUsers = () => _users
		.filter((user) => user.nick && user.online) // only online loged in
		.map((user) => ({
			nick: user.nick,
			rights: {
				toSee: user.hasRight(TO_SEE),
				toDraw: user.hasRight(TO_DRAW),
				toChangeRights: user.hasRight(TO_CHANGE_RIGHTS),
			}
		}))

	this.pushAction = (action) => {
		_actions.push(action)
		action.n = _actions.length
		return action
	}

	this.getActionsSince = (n) =>
		_actions.filter(action => action.n > n)

	this.emit = (...args) => {
		io.to(_token).emit(...args)
	}

	this.muteUser = (nick) => {
		const user = _users.find(user => user.nick === nick)
		user &&	user.removeRight(TO_DRAW)
	}

	this.blindUser = (nick) => {
		const user = _users.find(user => user.nick === nick)
		user &&	user.removeRight(TO_SEE)
	}

	this.unmuteUser = (nick) => {
		const user = _users.find(user => user.nick === nick)
		user &&	user.addRight(TO_DRAW)
	}

	this.unblindUser = (nick) => {
		const user = _users.find(user => user.nick === nick)
		user &&	user.addRight(TO_SEE)
	}

	this.toJSON = () => ({
		token: _token,
		creationTime: _creationTime,
		users: _users,
		actionsLength: _actions.length,
	})

}

module.exports = Instance