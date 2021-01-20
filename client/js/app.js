//  APP
const app = new (function App() {

	let console = new Logger("app")
	/////////////////////////////////
	// private:

	let _token
	let _nick
	let _secret

	let _events = {}

	let _actions = [] // all actions catching up from server

	const setToken = (token) => {
		location.hash = "#" + token
		_token = token
	}
	const setNick = (nick) => {
		_nick = nick
		localStorage['nick'] = nick
	}

	const fire = (eventName, ...args) => {
		if (eventName in _events && Array.isArray(_events[eventName])) {
			_events[eventName].forEach((cb) => { cb(...args) })
		}
	}

	// connection:
	function connectionOk() {
		console.log("connected")
		fire("connected")
	}
	function connectionNotOk() {
		console.log("disconnected")
		fire("disconnected")
	}
	io.on("connect", connectionOk)
	io.on("reconnect", connectionOk)
	io.on("connect_error", connectionNotOk)
	io.on("reconnect_error", connectionNotOk)
	io.on("disconnect", connectionNotOk)

	//

	io.on("users", (users) => {
		fire("userlist update", users.map((user) => ({
			...user,
			color: colorFromName(user.nick)
		})))
	})

	io.on("cursors", (cursors) => {
		fire("cursors update", cursors)
	})

	io.on("actions", (actions, cb) => {
		actions.forEach((action) => {
			// TODO check continuity
			_actions.push(action)
			fire("action update", action)
		})
		cb && cb()
	})


	/////////////////////////////////
	// public:


	/**
	 * register new event
	 * @param  {string}   eventName name of event
	 * @param  {Function} cb        callback
	 */
	this.on = (eventName, cb) => {
		if (!(eventName in _events)) {
			_events[eventName] = []
		}
		if (typeof cb !== "function") {
			return console.error(cb, "is not callable function")
		}
		_events[eventName].push(cb)
	}

	this.save = () => {
		if (!_token) {
			return console.error("nothing to save")
		}
		localStorage[_token] = JSON.stringify({
			token: _token,
			nick: _nick,
			secret: _secret,
		})
		console.log("saved")
	}

	this.load = function(token) {
		let data
		try {
			data = JSON.parse(localStorage[token])
		} catch(e) {
			console.err("bad data in localstorage", token)
		}
		_token = data.token
		_nick = data.nick
		_secret = data.secret
		console.log("loaded", data)
	}

	this.getToken = () => _token

	this.getNick = () => _nick

	/**************
	 * io methods *
	 **************/


	this.checkSessions = async (sessions) => {
		const verifiedSessions = []
		for (let session of sessions) {
			await new Promise((resolve) => {
				io.check(session, (err) => {
					if (!err) {
						verifiedSessions.push(session)
					} else {
						localStorage.removeItem([session.token])
					}
					resolve()
				})
			})
		}
		return verifiedSessions
	}

	/**
	 * register user with given name
	 * @param  {string}   nick nick of user
	 * @param  {Function} cb   callback function
	 */
	this.login = (nick, cb) => {
		if (!nick) {
			cb("nick required")
			return
		}

		io.login(nick, (err) => {
			if (err === null) {
				setNick(nick)
				fire("logged on")
				app.save()
			}
			cb(err)
		})
	}

	this.create = (cb) => {
		console.log("creating new canvas")
		let conf = {} // TODO settings?
		io.create(conf, (resp) => {
			if (resp.err === null) {
				setToken(resp.token)
				_secret = resp.secret
				app.save()
			}
			cb(resp.err)
		})
	}

	this.join = (cb) => {
		const token = location.hash.substr(1)
		console.log("token when joininig", token)
		if (token in localStorage) {
			this.load(token)
			io.join({
				token: token,
				secret: _secret, // loaded
			}, (resp) => {
				_secret = resp.secret
				cb(resp.err, false)
			})
		} else {
			io.join({
				token: token,
			}, (resp) => {
				_secret = resp.secret
				_token = token
				cb(resp.err, true)
			})
		}
	}

	this.postAction = (type, data, cb) => {
		const action = {
			type: type,
			data: data,
		}
		io.postAction(action, (response) => {
			if (typeof cb === "function") {
				cb(response)
			}
		})
	}

	this.postCursorPosition = onlyOncePerInterval((position) => {
		io.postCursor({
			position,
		})
	}, 125)

	this.sync = () => {
		const lastActionId = _actions.length
		io.sync(lastActionId)
	}

	// ACL

	this.toggleMuteToUser = (user) => {
		const what = user.rights.toDraw ? "mute" : "unmute"
		io.acl(what, user.nick, aclErrorHandler)
	}

	this.toggleBlindToUser = function(user) {
		const what = user.rights.toSee ? "blind" : "unblind"
		io.acl(what, user.nick, aclErrorHandler)
	}

	function aclErrorHandler(err) {
		console.error(err)
	}


})

function onlyOncePerInterval (func, interval) {
	let lastTimestamp = 0
	let finish
	return function onlyOnceWrapper () {
		let args = arguments
		let now = Date.now()
		if (lastTimestamp + interval < now) {
			func.apply(null, args)
			lastTimestamp = now
		} else {
			clearTimeout(finish)
			finish = setTimeout(function() {
				func.apply(null, args)
			}, interval)
		}
	}
}


function colorFromName (name) {
	let ang = 0
	for (let i = name.length - 1; i >= 0; i--) {
		ang += name[i].charCodeAt() + 1
		ang *= (i+1)*name[i].charCodeAt()
		ang %= 360
	}
	return new paper.Color({
		hue: ang,
		saturation: .8,
		lightness: .8,
	}).toCSS()
}
