//  APP
var app = new (function App(){

	/////////////////////////////////
	// private:
	
	var _token;
	var _nick;
	var _secret;

	var setToken = function(token){
		location.hash = "#" + token;
		_token = token;
	};
	var setNick = function(nick){
		_nick = nick;
		localStorage['nick'] = nick;
	};


	/////////////////////////////////
	// public:
	
	this.save = function(){
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
			}
			cb(resp.err);
		});
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
				secret: _secret,
			}, function(resp){
				_secret = resp.secret;
				cb(resp.err, false);
			});
		} else {
			io.join({
				token: token,
			}, function(resp){
				_secret = resp.secret;
				cb(resp.err, true);
			});
		}
	};

});