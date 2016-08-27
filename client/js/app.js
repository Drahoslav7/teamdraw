//  APP
var app = new (function App(){


	var console = new Logger("app");
	/////////////////////////////////
	// private:
	
	var _token;
	var _nick;
	var _secret;

	var _events = {};

	var _actions = []; // all actions catching up from server

	var setToken = function(token){
		location.hash = "#" + token;
		_token = token;
	};
	var setNick = function(nick){
		_nick = nick;
		localStorage['nick'] = nick;
	};

	var fire = function(eventName){
		var args = [].slice.call(arguments);
		args.shift();
		if(eventName in _events && Array.isArray(_events[eventName])){
			_events[eventName].forEach(function(cb){
				cb.apply(this, args);
			});
		}
	};

	// conneciton:
	function connectionOk(){
		console.log("connected");
		fire("connected");
	}
	function connectionNotOk(){
		console.log("disconnected");
		fire("disconnected");
	}
	io.on("connect", connectionOk)
	io.on("reconnect", connectionOk)
	io.on("connect_error", connectionNotOk);
	io.on("reconnect_error", connectionNotOk);

	//

	io.on("userlist", function(msg){
		fire("userlist update", msg.users);
	});

	io.on("cursors", function(cursors){
		fire("cursors update", cursors);
	});

	io.on("update", function(msg, cb){
		// TODO check continuity
		_actions.push(msg.data);
		fire("update", msg.data);
		if (cb) {
			cb();
		}
	});

	/// debug:

	io.on("user disconnected", function(){
		console.log("some user disconnected");
	});

	io.on("info", function(msg){
		fire("info", msg.data);
	});


	/////////////////////////////////
	// public:
	

	/**
	 * register new event
	 * @param  {string}   eventName name of event
	 * @param  {Function} cb        callback
	 */
	this.on = function(eventName, cb){
		if(!(eventName in _events)){
			_events[eventName] = [];
		}
		if(!("call" in cb)){
			return console.error(cb, "is not callable function");
		}
		_events[eventName].push(cb);
	};

	this.save = function(){
		if(!_token){
			console.error("nothing to save");
		}
		localStorage[_token] = JSON.stringify({
			token: _token,
			nick: _nick,
			secret: _secret,
		});
		console.log("saved");
	};

	this.load = function(token){
		try{
			var data = JSON.parse(localStorage[token]);
		} catch(e){
			console.err("bad data in localstorage", token);
		}
		_token = data.token;
		_nick = data.nick;
		_secret = data.secret;
		console.log("loaded", data);
	}

	this.getToken = function(){
		return _token;
	}

	this.getNick = function(){
		return _nick;
	}

	/**
	 * register user with given name
	 * @param  {string}   nick nick of user
	 * @param  {Function} cb   callback function
	 */
	this.login = function(nick, cb){
		if(!nick){
			cb("nick required");
			return; 
		}

		io.login(nick, function(resp){
			if(resp.err === null){
				setNick(nick);
				fire("logged on");
			}
			cb(resp.err);
		});
		this.save();
	};

	this.create = function(cb){
		console.log("creating new canvas");
		var conf = {}; // TODO nastavení?
		io.create(conf, function (resp){
			if(resp.err === null){
				setToken(resp.data.token);
				_secret = resp.data.secret;
				cb(null);
			} else {
				cb(resp.err);
			}
		});
	};

	this.join = function(cb){
		var token = location.hash.substr(1);
		console.log("token when joininig", token);
		if(token in localStorage){
			this.load(token); 
			io.join({
				token: token,
				secret: _secret, // loaded
			}, function(resp){
				_secret = resp.secret;
				cb(resp.err, false);
			});
		} else {
			io.join({
				token: token,
			}, function(resp){
				_secret = resp.secret;
				_token = token;
				cb(resp.err, true);
			});
		}
	};

	this.postAction = function(type, data){
		var action = {
			type: type,
			data: data
		}
		_actions.push(action);
		io.postAction(action);
	};

	this.postCursorPosition = onlyOncePerInterval(function (position) {
		io.postCursor({
			name: app.getNick(),
			position: position,
		});
	}, 125);

	this.sync = function(){
		var lastActionId = _actions.length;
		io.sync(lastActionId);
	};

	this.export = function(){
		fire("export");
	};

});

function onlyOncePerInterval (func, interval) {
	var lastTimestamp = 0;
	var finish;
	return function onlyOnceWrapper () {
		var args = arguments;
		var now = Date.now();
		if (lastTimestamp + interval < now) {
			func.apply(null, args);
			lastTimestamp = now;
		} else {
			clearTimeout(finish);
			finish = setTimeout(function(){
				func.apply(null, args);
			}, interval);
		}
	};
}