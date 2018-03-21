const Logger = function (name, color) {
	color = color || {
		main: "blue",
		app: "green",
		draw: "brown",
		io: "purple",
		admin: "pink",
	}[name] || "black"

	this.log = console.log.bind(console, "%c"+name+":", "color:"+color)
	this.err = console.error.bind(console, "%c"+name+":", "color:"+color)

	this.error = function(err, ...args) {
		if (err !== null) {
			return this.err(...args, arguments)
		}
	}
	return this
}