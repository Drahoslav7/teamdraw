/* config */
const server = {
	hostname: location.hostname,
	port: 7890,
};

// IO wrapper
var io = new (function Client(){
	var io = window.io;
	var socket = io.connect("http://" + server.hostname + ":" + server.port);
	socket.on('ping', function (data) {
		console.log('ping', data);
		socket.emit('pong', "hello back");
	});

	this.on = socket.on.bind(socket);

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

});
