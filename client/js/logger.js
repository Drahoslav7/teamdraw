var Logger = function(name, color){
	color = color || {
		"main": "blue",
		"app": "green",
		"draw": "brown",
		"io": "purple",
	}[name] || "black";


	this.log = console.log.bind(console, "%c"+name+":", "color:"+color);
	this.err = console.error.bind(console, "%c"+name+":", "color:"+color);

	this.error = function(err){
		if (err !== null) {
			return this.err.apply(this.err, arguments);
		}
	};
	return this;
}