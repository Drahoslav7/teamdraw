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

	this.postAction = function(action, cb){
		socket.emit("action", action, cb);
	}

	// without response


	this.postCursor = function(cursor){
		socket.emit("cursor", cursor);
	}

	this.sync = function(lastActionId){
		socket.emit("sync", lastActionId);
	}

	this.acl = function(action, userNick){
		socket.emit("acl", {
			what: action,
			nick: userNick,
		});
	}


});
