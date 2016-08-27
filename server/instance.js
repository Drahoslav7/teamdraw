var crypto = require("./crypto");

var instances = {};

Instance.get = function(token) {
	return instances[token];
}

function Instance(io) {
	// private:
	
	var _actions = []; // this has to be syncing across clients
	var _token; // globally unicate identifier of instance
	var _users = []; // collection of obejcts {secret: string, nick: string, rights: number}
	var _creationTime = new Date();

	do {
		_token = crypto.genToken();
	} while(_token in instances);

	instances[_token] = this;

	// public:

	/**
	 * this had to be called twice, without nick when creating or joining
	 * and with nick when logging
	 * @param  {User} user to (re)join
	 * @return {error}        error if some
	 */
	this.join = function(user, userSocket) {

		if (user.nick) {
			if (_users.some(function(otherUser) {
				return otherUser.nick === user.nick && user.getSecret() !== otherUser.getSecret();
			})) {
				return "nick already taken";
			};
		}

		// update if exists
		var existingUser = _users.find(function(otherUser, i) {
			if (user.getSecret() === otherUser.getSecret()) {
				user.setRight(otherUser.getRights());
				this[i] = user;
				return true;
			}
		});
		// othervise push as new
		if (!existingUser) {
			_users.push(user);
		}

		if (userSocket) {
			userSocket.join(_token);
		}

		console.log(user.nick, "joined", _token);
		return null;
	};

	this.leave = function (user) {
		_users = _users.filter(function (anotherUser) {
			return user.getSecret() !== anotherUser.getSecret();
		});
	};


	this.getToken = function() {
		return _token;
	};

	this.getUsers = function() {
		var users = [];
		_users.forEach(function(user) {
			if (user.nick) {
				users.push(user.nick);
			}
		});
		return users;
	};

	this.pushAction = function(action) {
		_actions.push(action);
		action.n = _actions.length;
		return action;
	};

	this.getActionsSince = function(n){
		return _actions.filter(function(action){
			return action.n > n;
		});
	};

	this.emit = function() {
		io.to(_token).emit.apply(io.to(_token), arguments);
	};

	this.toJSON = function() {
		return {
			name: _token,
			time: _creationTime,
			users: _users,
			actionsLength: _actions.length,
		};
	};

}

module.exports = Instance;