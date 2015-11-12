//  APP
var app = new (function App(){

	/////////////////////////////////
	// private:
	
	var _token;
	var _nick;

	var setToken = function(token){
		location.hash = "#" + token;
		_token = token;
	};

	/////////////////////////////////
	// public:

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
				_nick = nick;
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
				cb(null);
			} else {
				cb(resp.err);
			}
		});
	};

	this.join = function(){
		var token = location.hash.substr(1);
	};


});