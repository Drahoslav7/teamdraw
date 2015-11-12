var PORT = 7890; // TODO include from file shared for server

var io = require('socket.io')(PORT); 

io.on('connection', function (socket) {
  io.emit('greeting', { msg: 'hi there'});

  socket.on('msg', function (data) {
    console.log('msg', data);
  });

  socket.on('disconnect', function () {
    io.emit('user disconnected');
  });
});

console.log("server is running on port", PORT);