var app = new ((function(){
	var token = "";

	return function(){
		this.getToken = function() {
			return token;
		}
		this.setToken = function(tk){
			token = tk;
		}
	}
})());

/* config */
app.config = {
	"server": "localhost",
	"port": 7890,
}; // TODO include from file shared for server

app.nickname = ""; // ??? je potřeba?

/* instane data */
app.instance = {};


app.init = function(){
	if(location.hash === "" || location.hash === "#") {
		$("#signmodal").modal("show");
	} else {
		var token = location.hash.substr(1);
		// app.connector.verifyToken(token, function(){ // TODO zkontrolovat na serveru
		// 	app.setToken(token);
		// });
	}
};

app.log = function(msg){
	var statusbar = $("<div class='statusbar'></div>");
	$("body").append(statusbar);
	statusbar.hide();
	statusbar.html(msg);
	statusbar.show(200, function(){
		setTimeout(function(){
			statusbar.hide(200, function(){
				// $("body").remove(statusbar); // bug, jquery haze chybu
			})
		}, 500);
	});
}

/* main */
$(function(){

	app.init();

	/* buttons bindings */
	$("#sharebutton").click(function(){
		$("#sharemodal").modal("show");
	});
	$("#area").click(function(){
		app.log("area clicked");
	});


	/* modals */

	$("#signmodal").on("shown.bs.modal", function(){
		app.log("sign modal");
		$("#signmodal form").submit(function(event){
			var nick = $("#signmodal #nick").val();
			event.preventDefault();
			if(nick !== ""){
				app.nickname = nick;
				$("#signmodal").modal("hide");
				app.log("nick ok");
			} else {
				app.log("no nick");
			}
		});
	});

	$("#sharemodal").on("shown.bs.modal", function(){
		app.log("share modal");
		var link = location.origin + location.pathname + app.getToken();
		$("#sharemodal #link").val(link);
		$("#sharemodal #link").select();
		$("#sharemodal .btn-primary").click(function(){
			$("#sharemodal").modal("hide");
		});
	});

});
