const PORT = 7890;

var io = require('socket.io')(PORT); 
var tool = require("./tools");

io.on('connection', function (socket) {
	console.log("user connected");

	/* pingpong */
	io.emit('ping', "hello");

	socket.on('pong', function (data) {
		console.log('pong', data);
	});

	socket.on('disconnect', function () {
		io.emit('user disconnected');
	});


	/* app actions */
	socket.on("create", function(data, cb){
		cb({
			err: null,
			data: {
				token: tool.genToken(),
			},
		});
	});

	socket.on("login", function(nick, cb){
		console.log("login", nick);
		cb({
			err: null
		});
	});

});

console.log("Server is running on port", PORT);