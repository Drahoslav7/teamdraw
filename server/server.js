const PORT = 7890;

var io = require('socket.io')(PORT); 
var tool = require("./tools");

var instances = {};

function Instance(token){
	// private:
	
	var _actions = []; // this has to be syncing along clients

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
		io.to(_token).emit("update", {
			data: {
				action: action,
				n: _actions.length,
			}
		});
	}
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
		instance.join(secret);

		cb({
			err: null,
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
		instance.pushAction(item);
		cb({err: null});
	})

});

console.log("Server is running on port", PORT);

// test