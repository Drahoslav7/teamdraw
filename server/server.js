const PORT = process.env.PORT || 7890;

// if each SSL_* variable is defined, https will be used
const SSL_KEY = process.env.SSL_KEY;
const SSL_CERT = process.env.SSL_CERT;
const SSL_CA = process.env.SSL_CA;

/*
 * Origin of client must match one of the following.
 * Note that 'file://' results to 'Origin: null',
 * which is not allowed by Access-Control-Allow-Origin,
 * thus http(s):// must be used to serve client, not file://.
 */
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || "*//localhost:* *//127.0.0.1:*";

// TODO: make constants above configurable by program arguments

var server;
if (!SSL_KEY || !SSL_CA || !SSL_CERT) { // http
	server = require('http').createServer().listen(PORT);
} else { // https
	var fs = require('fs');
	server = require('https').createServer({
		key: fs.readFileSync(SSL_KEY),
		cert: fs.readFileSync(SSL_CERT),
		ca: fs.readFileSync(SSL_CA),
	}).listen(PORT);
}

var io = require("socket.io").listen(server, {
	origins: ALLOWED_ORIGINS
});
var crypto = require("./crypto");

var instances = {};

/**
 * user rights
 */
const TO_SEE = 1<<0;
const TO_DRAW = 1<<1;
const TO_CHANGE_RIGHTS = 1<<2;

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

function Instance() {
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

io.on('connection', function (socket) {
	console.log("user connection");

	var user;
	var instance;

	/* app actions */

	/**
	 * Create new instance
	 * @param  {object} data {}
	 * @param  {function} cb
	 */
	socket.on("create", function(data, cb){
		if (instance) {
			return cb({
				err: "instance already created"
			});
		}
		if (user) {
			return cb({
				err: "user already created"
			});
		}
		
		user = new User();
		user.setRight(TO_CHANGE_RIGHTS);

		instance = new Instance();
		var err = instance.join(user);
		
		cb({
			err: err,
			data: {
				token: instance.getToken(),
				secret: user.getSecret(), 
			},
		});
	});

	/**
	 * Join to existing instance
	 * @param  {object} data  {
	 *         token: string
	 *         secret: string|undefined
	 * }
	 * @param  {function} cb
	 */
	socket.on("join", function(data, cb){
		if (user) {
			return cb({
				err: "user already created"
			});
		}
		if (instance) {
			return cb({
				err: "already joined to instance"
			});
		}
		if (!(data.token in instances)) {
			return cb({
				err: "instance with this token does not exists"
			});
		}
		instance = instances[data.token];

		user = new User(data.secret);
		var err = instance.join(user);

		cb({
			err: err,
			secret: user.getSecret(),
		});
	});

	/**
	 * Log in, that means to set nick to unnamed user already created in instance.
	 * And start listenning to events in instance's room.
	 * Must be called after create or join!
	 * @param  {string} nick
	 * @param  {function} cb
	 */
	socket.on("login", function(nick, cb){
		console.log("login", nick);
		if (instance === undefined) {
			return cb({
				err: "no instance to login to",
			});
		}
		if (user === undefined) {
			return cb({
				err: "no user to name when loging in",
			});
		}
		
		user.nick = nick;
		var err = instance.join(user, socket);

		cb({
			err: err
		});

		instance.emit("userlist", {
			users: instance.getUsers()
		});
	});

	socket.on("action", function(action, cb) {
		var savedAction = instance.pushAction(action);
		instance.emit("update", {
			data: savedAction
		});

	});

	socket.on("sync", function(lastActionId) {
		var actions = instance.getActionsSince(lastActionId);
		sendNextOne();
		function sendNextOne() {
			if(actions.length !== 0) {
				socket.emit("update", {
					data: actions.shift()
				}, sendNextOne);
			}
		}
	});

	socket.on("cursor", function(cursor) {
		if (instance) { // why this happens before login?
			instance.emit("cursors", [cursor]);
		}
	});

});

console.log("Server is running on port", PORT);
