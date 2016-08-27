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

var User = require("./user");
var Instance = require("./instance");


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

		instance = new Instance(io);
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

		instance = Instance.get(data.token);

		if (!instance) {
			return cb({
				err: "instance with this token does not exists"
			});
		}

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
