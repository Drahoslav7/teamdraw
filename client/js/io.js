/* config */
const server = {
	hostname: location.hostname || "localhost",
	port: 7890,
};

// IO wrapper
var io = new (function Client(){

	var console = new Logger('io');
	
	var io = window.io;
	var socket = io.connect(location.protocol + "//" + server.hostname + ":" + server.port);

	this.on = socket.on.bind(socket);

	// with response

	this.login = function(nick, cb){
		socket.emit("login", nick, function(response){
			cb(response);
		});
	};

	this.create = function(data, cb){
		socket.emit("create", data, function(response){
			cb(response);
		});
	};

	this.join = function(data, cb){
		socket.emit("join", data, function(response){
			cb(response);
		});
	};

	// without response

	this.postAction = function(action){
		socket.emit("action", action);
	}

	this.sync = function(lastActionId){
		socket.emit("sync", lastActionId);
	}


});
