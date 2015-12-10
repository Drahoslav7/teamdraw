/* ========== MAIN ========== */

$(function(){

	var errormodal = $("#errormodal");

	var neterrormodal = $("#neterrormodal");
	var neterrormodal_visible = false;

	$("#signmodal").modal({
		"backdrop" : "static",
		"keyboard" : false,
		"show": false,
	});

	neterrormodal.modal({
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
				errormodal.modal("show");
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
		console.log(users); // users = pole jmen

		var userList = $("#usermenu");

		tool.log("New User");

		$("#online-count").html(users.length);
		userList.empty();
		users.forEach(function (item) {
			userList.append("<div class='" + ((item===app.getNick())?"mySelf":"") + "'>" + item + "</div>");
		});
		gui.userListResize(true);
	});

	app.on("disconnected", function(){
		neterrormodal.modal("show");
		neterrormodal_visible = true;
	});

	app.on("connected", function(){
		if (neterrormodal_visible) {
			neterrormodal.modal("hide");
			neterrormodal_visible = false;
		}
		$("#alert").fadeIn("fast");
		setTimeout(function () {
			$("#alert").fadeOut("slow");
		}, 2000);
	});



	/* buttons events */

	$("#sharebutton").click(function(){
		$("#sharemodal").modal("show");
	});
	$("#help-button").click(function(){
		$("#helpmodal").modal("show");
	});
	$("#new-button").click(function(){
		window.open(location.toString().split('#')[0]);
	});
	$(".save-image-button").click(function(){
		var url = draw.getUrl("svg"); // TODO png
		$('.export-img-button').attr('href', url);
		$("#savemodal").modal("show");
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
					tool.log("Invalid Nick");
				}
			});
		});
	});

	$("#sharemodal").on("shown.bs.modal", function(){
		tool.log("share modal");
		var link = location.toString().split('#')[0] + "#" + app.getToken();
		$("#sharemodal #link").val(link);
		$("#sharemodal #link").select();
		$("#sharemodal .btn-primary").click(function(){
			$("#sharemodal").modal("hide");
		});
	});


	$("#helpmodal .btn-primary").click(function(){
		$("#helpmodal").modal("hide");
	});

	$("#errormodal .btn-primary").click(function(){
		location = location.pathname;
	});

	$('.export-img-button').click(function(event){
		event.preventDefault();
		var type = $(this).attr('data-img-type');
		console.log("exporting as",type);
		window.open($(this).attr('href'), '_blank');
		$("#savemodal").modal("hide");
	});


	/* other events */

	app.on("logged on", function(){

		app.sync();

		draw.selectTool("pencil");

		draw.setColor("red");
		draw.setSize(3);


		window.onbeforeunload = function(){
			app.save();
		}

		$(".btn-tool").click(function() {
			draw.selectTool($(this).attr("data-tool"));
		});
		

		// key bindings
		$(window).keydown(function(event){
			switch(event.keyCode){
				case 69: // e
					draw.selectTool("eraser");
					break;
				case 80: // p
					draw.selectTool("pencil");
					break;
				case 83: // s (select)
					draw.selectTool("pointer");
					break;
				case 77: // ms (move)
					draw.selectTool("move");
					break;
			}
		});

		// select move tool when spacebar down
		(function(){
			var prevToolName = '';
			var pressed = false;
			$(window).keydown(function(event){
				if(event.keyCode === 32 && !pressed){ // spacebar
					pressed = true;
					prevToolName = draw.getCurrentToolName();
					draw.selectTool("move");
				}
			})
			$(window).keyup(function(event){
				if(event.keyCode === 32){ // spacebar
					draw.selectTool(prevToolName);
					pressed = false;
				}
			})

		})();

	});// on logged on



});
