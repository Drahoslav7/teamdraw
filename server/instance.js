var crypto = require("./crypto");
require("./user");

var instances = {};

Instance.get = function(token) {
	return instances[token];
};

Instance.getAll = function() {
	return instances;
};

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
			if (_users.some(otherUser => otherUser.nick === user.nick && user !== otherUser)) {
				return new Error("nick already taken");
			};
		}

		var existingUser = _users.find(otherUser => user === otherUser);

		if (!existingUser) {
			_users.push(user);
		}

		if (userSocket) {
			userSocket.join(_token);
		}
		user.online = true

		console.log(user.nick, "joined", _token);
		return null;
	};

	this.leave = function (user) {
		_users.forEach( anotherUser => {
			if (user === anotherUser) {
				user.online = false;
			}
		});
		;
	};


	this.getToken = function() {
		return _token;
	};

	this.getUsers = function() {
		var users = [];
		_users.forEach(function(user) {
			if (user.nick && user.online) {
				users.push({
					nick: user.nick,
					rights: {
						toSee: user.hasRight(TO_SEE),
						toDraw: user.hasRight(TO_DRAW),
						toChangeRights: user.hasRight(TO_CHANGE_RIGHTS),
					}
				});
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

	this.muteUser = function(nick) {
		var user = _users.find(user => user.nick === nick);
		if(user) {
			user.removeRight(TO_DRAW);
		}
	};

	this.blindUser = function(nick) {
		var user = _users.find(user => user.nick === nick);
		if(user) {
			user.removeRight(TO_SEE);
		}
	}

	this.unmuteUser = function(nick) {
		var user = _users.find(user => user.nick === nick);
		if(user) {
			user.addRight(TO_DRAW);
		}
	};

	this.unblindUser = function(nick) {
		var user = _users.find(user => user.nick === nick);
		if(user) {
			user.addRight(TO_SEE);
		}
	}

	this.toJSON = function() {
		return {
			token: _token,
			creationTime: _creationTime,
			users: _users,
			actionsLength: _actions.length,
		};
	};

}

module.exports = Instance;