var Logger = function(name, color){
	color = color || {
		"main": "blue",
		"app": "green",
		"draw": "brown",
		"io": "purple",
	}[name] || "black";


	this.log = console.log.bind(console, "%c"+name+":", "color:"+color);

	this.error = function(err){
		if (err !== null) {
			return console.error.bind(console, "%c"+name+":", "color:"+color).apply(console, arguments);
		}
	};
	return this;
}