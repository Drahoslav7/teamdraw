/* ========== MAIN ========== */

$(function(){

	var console = new Logger("main");

	var errormodal = $("#errormodal");

	var neterrormodal = $("#neterrormodal");

	var helpmodal = $("#helpmodal");

	$("#signmodal").modal({
		"backdrop" : "static",
		"keyboard" : false,
		"show": false,
	});

	errormodal.modal({
		"backdrop" : "static",
		"keyboard" : false,
		"show": false,
	});

	neterrormodal.modal({
		"backdrop" : "static",
		"keyboard" : false,
		"show": false,
	});

	helpmodal.modal({
		"backdrop" : false,
		"show": false,
	});
	helpmodal.on("show.bs.modal", function() {
		$('[title]').tooltip("show");
		gui.menuResize();
		if (!gui.isUserlistVisible()) {
			gui.userListResize();
		}
		if (!gui.isToolListVisible()) {
			gui.toolBarResize();
		}
		helpmodal.one("hide.bs.modal", function() {
			$('[title]').tooltip("hide");
		});
	});



	// init

	if(location.hash === "" || location.hash === "#") {
		app.create(function(err){
			// TODO err
			console.error(err);
			$("#signmodal").modal("show");
		});
	} else {
		app.join(function(err, fresh){
			// TODO err
			if(err){
				errormodal.modal("show");
			}
			console.error(err);
			if(fresh){
				$("#signmodal").modal("show");
			} else {
				app.login(app.getNick(), function(err){
					// TODO err
					console.error(err);
				});
			}
		});
	}

	/* app events */

	app.on("userlist update", function(users){
		var userList = $("#userlist");

		console.log("New User", users);

		$("#online-count").html(users.length);
		userList.empty();

		users.forEach(function (user) {
			userList.append(gui.createUserElement(user));
		});
		gui.userListResize(true);
	});

	app.on("disconnected", function(){
		neterrormodal.modal("show");
	});

	app.on("connected", function(){
		neterrormodal.modal("hide");

		$("#alert").fadeIn("fast");
		setTimeout(function () {
			$("#alert").fadeOut("slow");
		}, 2000);
	});



	/* buttons events */

	$("#share-button").click(function(){
		$("#sharemodal").modal("show");
		$("#share-button").removeClass("btn-warning-c");
	});
	$("#help-button").click(function(){
		helpmodal.modal("show");
	});
	$("#new-button").click(function(){
		window.open(location.toString().split('#')[0]);
	});
	$("#save-button, #save-button-neterror").click(function(){
		var url = draw.getUrl("svg"); // TODO png
		$('#savemodal .export-img-button').attr('href', url);
		$("#savemodal").modal("show");
	});

	/* modals on show events */

	$("#signmodal").on("shown.bs.modal", function(){
		console.log("sign modal");
		$("#nick").focus();
		if(localStorage['nick']){
			$("#nick").val(localStorage['nick']);
		}
		$("#signmodal form").submit(function(event){
			event.preventDefault();
			var nick = $("#signmodal #nick").val();
			app.login(nick, function(err){
				console.error(err);
				if(err === null){
					console.log("nick ok");
					$("#signmodal").modal("hide");
				} else {
					$("#nickgroup").addClass("has-error");
					$("#nick").attr("placeholder", err);
					console.log("Invalid Nick");
				}
			});
		});
	});

	$("#sharemodal").on("shown.bs.modal", function(){
		console.log("share modal");
		var link = location.toString().split('#')[0] + "#" + app.getToken();
		$("#sharemodal #link").val(link);
		$("#sharemodal #link").select();
		$("#sharemodal .btn-primary").click(function(){
			$("#sharemodal").modal("hide");
		});
	});


	$("#helpmodal .btn-primary").click(function(){
		helpmodal.modal("hide");
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


	/* toolbar */

	$(".btn-tool[data-tool]").click(function() {
		draw.selectTool($(this).attr("data-tool"));
	});
		

	/* other events */

	app.on("logged on", function(){

		$("#share-button").addClass("btn-warning-c");

		app.sync();

		draw.selectTool("pencil");

		draw.setColor("#333");
		draw.setSize(2);


		window.onbeforeunload = function(){
			app.save();
		};

		// key bindings
		$(window).keydown(function(event){
			if(draw.getCurrentToolName() !== 'text') {
				switch(event.keyCode){
					case 83: // s
						draw.selectTool("selector");
						break;
					case 80: // p
						draw.selectTool("pencil");
						break;
					case 69: // e
						draw.selectTool("eraser");
						break;
					case 77: // m
						draw.selectTool("move");
						break;
					case 67: // c
						draw.selectTool("eyedropper");
						break;
					case 76: // l
						draw.selectTool("line")
						break;
					case 82: // r
						draw.selectTool("rectangle")
						break;
					case 84: // t
						draw.selectTool("text");
						event.preventDefault();
						break;

					case 46: // del
						draw.deleteSelected();
						break;
					case 27: // esc
						draw.unselectAll();
						break;

					case 9: // tab
						// todo hide all gui
						event.preventDefault();
						break;

					case 37:
						draw.moveSelected('left');
						break;
					case 38:
						draw.moveSelected('up');
						break;
					case 39:
						draw.moveSelected('right');
						break;
					case 40:
						draw.moveSelected('down');
						break;
				}
			} else {
				if(event.keyCode === 27) { // ESC
					draw.selectTool('selector');
				}
			}
		});

		// wheel scroll
		$(window).on('mousewheel', function(e){
			draw.zoom(e.deltaY, {x: e.clientX, y: e.clientY});
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
				if(event.keyCode === 32 && pressed){ // spacebar
					draw.selectTool(prevToolName);
					pressed = false;
				}
			})

		})();

	});// on logged on



});
