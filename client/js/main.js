/* ========== MAIN ========== */

$(function(){

	$("#signmodal").modal({
		"backdrop" : "static",
		"keyboard" : false,
		"show": false,
	});

	// init
	if(location.hash === "" || location.hash === "#") {
		app.create(function(err){
			// TODO err
			tool.err(err);
			$("#signmodal").modal("show");
		});
	} else {
		app.join(function(err, fresh){
			// TODO err
			if(err){
				$("#invalidtokenmodal").modal("show");
			}
			tool.err(err);
			if(fresh){
				$("#signmodal").modal("show");
			} else {
				app.login(app.getNick(), function(err){
					// TODO err
					tool.err(err);
				});
			}
		});
	}

	/* app events */

	app.on("userlist update", function(users){ 
		// TODO, Davide, zpracuj to
		console.log(users); // users = pole jmen
		// app.getNick() vraci vlastni nick, kdybys ho chtel zvyraznit nebo neco
	});

	app.on("disconnected", function(){
		// TODO, Davide, zobraz nejak uživateli, že není připojen k serveru
	});
	app.on("connected", function(){
		// TODO, Davide, -||- je připojen k serveru
	});


	/* buttons events */

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
		tool.log("save clicked");
	});

	$("#debug-button").click(function(){
		var userList = $("#user-list");

		tool.log("test clicked");
		$("#online-count").html(parseInt($("#online-count").html())+1);
		userList.append("TEESTUSER" + "<br>");
	});

	$("#area").click(function(){
		tool.log("area clicked");
	});


	/* modals on show events */

	$("#signmodal").on("shown.bs.modal", function(){
		tool.log("sign modal");
		$("#nick").focus();
		if(localStorage['nick']){
			$("#nick").val(localStorage['nick']);
		}
		$("#signmodal form").submit(function(event){
			event.preventDefault();
			var nick = $("#signmodal #nick").val();
			app.login(nick, function(err){
				tool.err(err);
				if(err === null){
					tool.log("nick ok");
					$("#signmodal").modal("hide");
				} else {
					$("#nickgroup").addClass("has-error");
					$("#nick").attr("placeholder", err);
					tool.log("no nick");
				}
			});
		});
	});

	$("#sharemodal").on("shown.bs.modal", function(){
		tool.log("share modal");
		var link = location.protocol + "//" + location.pathname + "#" + app.getToken();
		$("#sharemodal #link").val(link);
		$("#sharemodal #link").select();
		$("#sharemodal .btn-primary").click(function(){
			$("#sharemodal").modal("hide");
		});
	});


	$("#helpmodal .btn-primary").click(function(){
		$("#helpmodal").modal("hide");
	});

	$("#invalidtokenmodal .btn-primary").click(function(){
		location = location.pathname;
	});


	/* other events */

	window.onbeforeunload = function(){
		app.save();
	}

});
