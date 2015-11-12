var tool = {};

tool.rand = function(n){
	return Math.floor(Math.random()*n);
}

tool.genToken = function (n) {
	n = n || 10;
	var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	var token = "";
	for (var i = 0; i < n; i++) {
		token += chars[tool.rand(char.length)];
	};
	return token;
}

module.exports = tool;