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
	$("#signmodal").modal({"backdrop" : "static", "keyboard" : 	false});
	if(location.hash === "" || location.hash === "#") {
		$("#signmodal").modal("show");
	} else {
		var token = location.hash.substr(1);
		// app.connector.verifyToken(token, function(){ // TODO zkontrolovat na serveru
			app.setToken(token);
		// });
	}
};

app.startClient = function(){
	var socket = io.connect('http://localhost:'+app.config.port);
	socket.on('greeting', function (data) {
		console.log('greeting', data);
		socket.emit('msg', { mynameis: app.nickname });
	});
	socket.on('this', function (data) {
		console.log('this', data);
	})
};

app.log = function(msg){
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

/* main */
$(function(){

	app.init();

	/* buttons bindings */
	$("#sharebutton").click(function(){
		$("#sharemodal").modal("show");
	});
	$("#help-button").click(function(){
		$("#helpmodal").modal("show");
	});
	$("#new-button").click(function(){
		window.open(location.protocol + "//" + location.pathname);
	});
	$("#save-button").click(function(){
		app.log("save clicked");
	});
	$("#area").click(function(){
		app.log("area clicked");
	});


	/* modals */

	$("#signmodal").on("shown.bs.modal", function(){
		app.log("sign modal");
		$("#nick").focus();
		$("#signmodal form").submit(function(event){
			var nick = $("#signmodal #nick").val();
			event.preventDefault();
			if(nick !== ""){
				app.nickname = nick;
				$("#signmodal").modal("hide");
				app.log("nick ok");
				app.startClient();

			} else {
				$("#nickgroup").addClass("has-error");
				$("#nick").attr("placeholder","Nickname required");
				//$("#signerr").removeClass("hidden");
				app.log("no nick");
			}
		});
	});

	$("#sharemodal").on("shown.bs.modal", function(){
		app.log("share modal");
		var link = location.protocol + "//" + location.pathname + "#" + app.getToken();
		$("#sharemodal #link").val(link);
		$("#sharemodal #link").select();
		$("#sharemodal .btn-primary").click(function(){
			$("#sharemodal").modal("hide");
		});
	});

	$("#helpmodal").on("shown.bs.modal", function(){
		app.log("help modal");
		$("#helpmodal .btn-primary").click(function(){
			$("#helpmodal").modal("hide");
		});
	});

});
