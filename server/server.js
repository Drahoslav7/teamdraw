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

var io = require("socket.io")(server, {
	origins: ALLOWED_ORIGINS
});

var User = require("./user");
var Instance = require("./instance");


console.log("Server is running on port", PORT);

/**
 * MAIN IO
 */
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
			return cb({	err: "instance already created"	});
		}
		if (user) {
			return cb({	err: "user already created"	});
		}

		user = new User();
		user.addRight(TO_CHANGE_RIGHTS);
		socket.user = user;

		instance = new Instance(io);
		var err = instance.join(user);

		cb({
			err: err,
			data: {
				token: instance.getToken(),
				secret: user.getSecret(),
			},
		});
		adminio.inform();
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
			return cb({	err: "already joined to instance" });
		}
		if (user) {
			return cb({	err: "user already created"	});
		}

		instance = Instance.get(data.token);

		if (!instance) {
			return cb({	err: "instance with this token does not exists"	});
		}

		user = new User(data.secret);
		socket.user = user;
		var err = instance.join(user);

		cb({
			err: err,
			secret: user.getSecret(),
		});
		adminio.inform();
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
			return cb({	err: "no instance to login to" });
		}
		if (user === undefined) {
			return cb({	err: "no user to name when loging in" });
		}

		user.nick = nick;
		var err = instance.join(user, socket);
		if (err) {
			user.nick = undefined;
		}

		cb({
			err: err
		});

		instance.emit("userlist", {
			users: instance.getUsers()
		});
		afterLogin();

		adminio.inform();
	});

	/**
	 * event below should only be used after join or create
	 */
	function afterLogin() {

		socket.on("action", function(action, cb) {
			if (!user.hasRight(TO_DRAW)) {
				return cb(new Error("No right to draw"));
			}
			var savedAction = instance.pushAction(action);
			instance.emit("update", {
				data: savedAction
			});
			cb();
			adminio.inform();
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

		socket.on("disconnect", function() {
			console.log("user disconnected");
			if (!instance || !user) {
				return;
			}
			if (!isUserAlsoOnAnotherSocket(user)) {
				instance.leave(user);

				instance.emit("userlist", {
					users: instance.getUsers()
				});
				adminio.inform();
				console.log("user", user.name, "leaved");
			};
		});

		socket.on("acl", function(data) {
			if (!user.hasRight(TO_CHANGE_RIGHTS)) {
				return;
			}
			var methodName = data.what + "User";
			if (methodName in instance) {
				instance[methodName](data.nick);

				instance.emit("userlist", {
					users: instance.getUsers()
				});
				adminio.inform();
			}
		});

	}


	function isUserAlsoOnAnotherSocket(user) {
		for (var socketID in io.sockets.connected) {
			var anotherSocket = io.sockets.connected[socketID];
			if (anotherSocket.user) {
				if (socket.user === anotherSocket.user && socket !== anotherSocket) {
					return true;
				}
			}
		};
		return false;
	}

});


/**
 * ADMINISTRATOR IO
 */

var adminio = io.of("/admin");

adminio.inform = function() {
	if (this.sockets.length !== 0) {
		this.emit("instances", Instance.getAll());
	}
}

adminio.on("connection", function(socket) {
	console.log("admin connection");

	socket.on("get instances", function(data, callback) {
		callback(Instance.getAll());
	});
});
