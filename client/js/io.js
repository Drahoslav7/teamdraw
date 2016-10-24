// IO wrapper
var io = new (function Client(){

	var console = new Logger('io');

	var io = window.io;
	var socket = io.connect(location.protocol + "//" + server.hostname + ":" + server.port);

	this.on = socket.on.bind(socket);

	// with response

	this.login = function(nick, cb){
		socket.emit("login", nick, cb);
	};

	this.create = function(data, cb){
		socket.emit("create", data, cb);
	};

	this.join = function(data, cb){
		socket.emit("join", data, cb);
	};

	this.postAction = function(action, cb){
		socket.emit("action", action, cb);
	}

	this.acl = function(action, userNick, cb){
		socket.emit("acl", {
			what: action,
			nick: userNick,
		}, cb);
	}


	// without response

	this.postCursor = function(cursor){
		socket.emit("cursor", cursor);
	}

	this.sync = function(lastActionId){
		socket.emit("sync", lastActionId);
	}



});
