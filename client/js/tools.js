var tool = {};

tool.log = function(msg){
	var statusbar = $("<div class='statusbar'></div>");
	$("body").append(statusbar);
	statusbar.hide();
	statusbar.html(msg);
	console.log(msg);
	statusbar.show(200, function(){
		setTimeout(function(){
			statusbar.hide(200, function(){
				// $("body").remove(statusbar); // bug, jquery haze chybu
			})
		}, 500);
	});
}

tool.err = function(err){
	if(err)
		console.error("ERR", err);
}