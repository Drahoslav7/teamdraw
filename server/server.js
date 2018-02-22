const PORT = process.env.PORT || 7890

// if each SSL_* letiable is defined, https will be used
const SSL_KEY = process.env.SSL_KEY
const SSL_CERT = process.env.SSL_CERT
const SSL_CA = process.env.SSL_CA

/*
 * Origin of client must match one of the following.
 * Note that 'file://' results to 'Origin: null',
 * which is not allowed by Access-Control-Allow-Origin,
 * thus http(s):// must be used to serve client, not file://.
 */
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || "*//localhost:* *//127.0.0.1:*"

// TODO: make constants above configurable by program arguments

let server
if (!SSL_KEY || !SSL_CA || !SSL_CERT) { // http
	server = require('http').createServer().listen(PORT)
} else { // https
	let fs = require('fs')
	server = require('https').createServer({
		key: fs.readFileSync(SSL_KEY),
		cert: fs.readFileSync(SSL_CERT),
		ca: fs.readFileSync(SSL_CA),
	}).listen(PORT)
}

let io = require("socket.io")(server, {
	origins: ALLOWED_ORIGINS
})

let User = require("./user")
let Instance = require("./instance")


console.log("Server is running on port", PORT)

Error.prototype.toJSON = function() {
	return this.message
}

/**
 * MAIN IO
 */
io.on('connection', (socket) => {
	console.log("user connection")

	let user
	let instance

	/* app actions */

	/**
	 * Create new instance
	 * @param  {object} data {}
	 * @param  {function} cb
	 */
	socket.on("create", (data, cb) => {
		if (instance) {
			return cb({ err: new Error("instance already created") })
		}
		if (user) {
			return cb({ err: new Error("user already created") })
		}

		instance = new Instance(io)

		user = new User()
		user.addRight(TO_CHANGE_RIGHTS)
		socket.user = user
		let err = instance.join(user, socket) // should not fail ever

		cb({
			err: err,
			token: instance.getToken(),
			secret: user.getSecret(),
		})
		adminio.inform(instance)
	})

	/**
	 * Join to existing instance
	 * @param  {object} data  {
	 *         token: string
	 *         secret: string|undefined
	 * }
	 * @param  {function} cb
	 */
	socket.on("join", (data, cb) => {
		if (instance) {
			return cb({ err: new Error("already joined to instance") })
		}
		if (user) {
			return cb({ err: new Error("user already created") })
		}

		instance = Instance.get(data.token)

		if (!instance) {
			return cb({ err: new Error("instance with this token does not exists") })
		}

		user = new User(data.secret) // might actually return existing user
		socket.user = user
		// TODO set dafault rights
		let err = instance.join(user, socket)

		cb({
			err: err,
			secret: user.getSecret(),
		})
		synchronize(0)
		adminio.inform(instance)
	})

	/**
	 * Log in, that means to set nick to unnamed user already created in instance.
	 * And start listenning to events in instance's room.
	 * Must be called after create or join!
	 * @param  {string} nick
	 * @param  {function} cb
	 */
	socket.on("login", (nick, cb) => {
		console.log("login", nick)
		if (!instance) {
			return cb(new Error("no instance to login to"))
		}
		if (!user) {
			return cb(new Error("no user to name when loging in"))
		}

		user.nick = nick
		if (!instance.canUseNick(user)) {
			user.nick = undefined
			return cb(new Error("nick already taken"))
		}

		cb(null)

		instance.emit("users", instance.getUsers())
		afterLogin()

		adminio.inform(instance)
	})

	socket.on("disconnect", () => {
		console.log("user disconnected")
		if (!instance || !user) {
			return
		}
		if (!isUserAlsoOnAnotherSocket(user)) {
			user.online = false // means go offline, but stay in instance

			instance.emit("users", instance.getUsers())
			adminio.inform(instance)
			console.log("user", user.name, "leaved")
		}
		user = undefined
		instance = undefined
	})

	/**
	 * event below should only be used after login
	 */
	function afterLogin() {
		socket.on("action", (action, cb) => {
			if (!user.hasRight(TO_DRAW)) {
				return cb(new Error("No right to draw"))
			}
			let savedAction = instance.pushAction(action)
			instance.emit("actions", [savedAction])
			cb(null)
			adminio.inform(instance)
		})

		socket.on("sync", synchronize)

		socket.on("cursor", (cursor) => {
			// TODO optimise - wait for more a bit then release
			cursor.name = user.nick
			instance.emit("cursors", [cursor])
		})

		socket.on("acl", (data, cb) => {
			if (!user.hasRight(TO_CHANGE_RIGHTS)) {
				return cb(new Error("No right to change rights"))
			}
			let methodName = data.what + "User"
			if (!(methodName in instance)) {
				return cb(new Error('Unknown acl action'))
			}
			instance[methodName](data.nick)

			instance.emit("users", instance.getUsers())
			cb(null)
			adminio.inform(instance)
		})

	}


	function synchronize(lastActionId) {
		let actions = instance.getActionsSince(lastActionId)
		const sendNextBatch = () => {
			let batchSize = Math.max(Math.floor(Math.log(actions.length)), 1)
			let batch = actions.splice(0, batchSize)
			socket.emit("actions", batch, sendNextBatch)
		}
		sendNextBatch()
	}

	function isUserAlsoOnAnotherSocket(user) {
		for (let socketID in io.sockets.connected) {
			let anotherSocket = io.sockets.connected[socketID]
			if (anotherSocket.user) {
				if (socket.user === anotherSocket.user && socket !== anotherSocket) {
					return true
				}
			}
		}
		return false
	}

})


/**
 * ADMINISTRATOR IO
 */

const adminio = io.of("/admin")

adminio.inform = function(instance) {
	if (this.sockets.length !== 0) {
		if (!instance) {
			this.emit("instances", Instance.getAll())
		} else {
			this.emit("instance", instance)
		}
	}
}

adminio.on("connection", (socket) => {
	console.log("admin connection")

	socket.on("get instances", (data, callback) => {
		callback(Instance.getAll())
	})

	socket.on("remove user from instance", (data, callback) => {
		let user = User.get(data.secret)
		let instance = Instance.get(data.token)
		if (!instance) {
			return callback(new Error("instance not here"))
		}
		if (!user) {
			return callback(new Error("user not here"))
		}
		instance.remove(user)
		callback(null)
		adminio.inform(instance)
	})

	socket.on("destroy instance", (data, callback) => {
		let instance = Instance.get(data.token)
		if (!instance) {
			return callback(new Error("instance not here"))
		}
		instance.destroy()
		callback(null)
		adminio.inform()
	})
})
