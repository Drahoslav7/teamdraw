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

function Instance(token){
	// private:
	
	var _actions = []; // this has to be syncing across clients

	var _token = token; // globally unicate identifier of instance
	var _users = []; // collection of obejcts {secter: , nick: }

	// public:

	this.join = function(secret, nick){
		if(_users.some(function(user){
			return nick && user.nick === nick && user.secret != secret;
		})){
			return "name already taken";
		};

		var existing = _users.find(function(user){
			return user.secret === secret;
		});
		if(existing) {
			existing.nick = nick;
		} else{
			_users.push({secret: secret, nick: nick});
		}
		console.log(nick, "joined", token);
		return null;
	};


	this.getToken = function(){
		return _token;
	}

	this.getUsers = function(){
		var users = [];
		_users.forEach(function(user){
			if(user.nick){
				users.push(user.nick);
			}
		});
		return users; 
	};

	this.pushAction = function(action){
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


	/* pingpong */
	socket.emit('ping', "hello");
	socket.on('pong', function (data) {
		console.log('pong', data);
	});

	io.emit("info", { // to all
		err: null,
		data: "new connection",
	})
	socket.on('disconnect', function () {
		io.emit('user disconnected');
	});


	/* app actions */

	socket.on("create", function(data, cb){
		if(instance){
			return cb({
				err: "instance already created"
			});
		}
		secret = tool.genToken(20); // user verifier
		var token; // instance identifier
		do{
			token = tool.genToken();
		} while(token in instances);

		instance = new Instance(token);
		instance.join(secret);
		instances[token] = instance;
		
		cb({
			err: null,
			data: {
				token: token, 
				secret: secret, 
			},
		});
	});


	socket.on("join", function(data, cb){
		if(instance){
			return cb({
				err: "already joined to instance"
			});
		}
		if(!(data.token in instances)){
			return cb({
				err: "instance with this token does not exists"
			});
		}
		instance = instances[data.token];
		if(data.secret){
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

	socket.on("action", function(item, cb){
		var savedAction = instance.pushAction(item);
		io.to(instance.getToken()).emit("update", {
			data: savedAction
		});

	});

	socket.on("sync", function(lastActionId){
		instance.getActionsSince(lastActionId).forEach(function(action){
			socket.emit("update", {
				data: action
			});
		});
	});

});

console.log("Server is running on port", PORT);
