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
var tool = require("./tools");

var instances = {};

function Instance(){
	// private:
	
	var _actions = []; // this has to be syncing across clients
	var _token; // globally unicate identifier of instance
	var _users = []; // collection of obejcts {secret: string, nick: string}

	do {
		_token = tool.genToken();
	} while(_token in instances);

	instances[_token] = this;

	// public:

	/**
	 * this had to be called twice, without nick when creating or joining
	 * and with nick when logging
	 * @param  {string} secret to verify user
	 * @param  {string|undefined} nick
	 * @return {error}        error if some
	 */
	this.join = function(secret, nick) {
		if (nick) {
			if (_users.some(function(user) {
				return user.nick === nick && user.secret != secret;
			})) {
				return "nick already taken";
			};
		}

		var existing = _users.find(function(user) {
			return user.secret === secret;
		});
		if (existing) {
			existing.nick = nick;
		} else {
			_users.push({secret: secret, nick: nick});
		}
		console.log(nick, "joined", _token);
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

}



io.on('connection', function (socket) {
	console.log("user connected");

	var secret;
	var instance;

	io.emit("info", { // to all
		err: null,
		data: "new connection",
	})
	socket.on('disconnect', function () {
		io.emit('user disconnected');
	});


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
		secret = tool.genToken(20); // user verifier
		
		instance = new Instance();
		instance.join(secret);
		
		cb({
			err: null,
			data: {
				token: instance.getToken(), 
				secret: secret, 
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
		if (data.secret) {
			secret = data.secret;
		} else {
			secret = tool.genToken(20); // user verifier
		}
		var err = instance.join(secret);

		cb({
			err: err,
			secret: secret,
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
		if(instance === undefined){
			return cb({
				err: "no instance to login to",
			});
		}
		if(!secret){
			console.error("no secret when loging in");
		}
		
		var err = instance.join(secret, nick);

		cb({
			err: err
		});

		socket.join(instance.getToken());
		io.to(instance.getToken()).emit("userlist", {
			users: instance.getUsers()
		});
	});

	socket.on("action", function(action, cb) {
		var savedAction = instance.pushAction(action);
		io.to(instance.getToken()).emit("update", {
			data: savedAction
		});

	});

	socket.on("sync", function(lastActionId) {
		instance.getActionsSince(lastActionId).forEach(function(action) {
			socket.emit("update", {
				data: action
			});
		});
	});

	socket.on("cursor", function(cursor) {
		io.to(instance.getToken()).emit("cursors", [cursor]);
	});

});

console.log("Server is running on port", PORT);
