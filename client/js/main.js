/* ========== MAIN ========== */

$(function(){

	var console = new Logger("main");

	var errormodal = $("#errormodal");
	var neterrormodal = $("#neterrormodal");
	var helpmodal = $("#helpmodal");


	// init

	if(location.hash === "" || location.hash === "#") {
		app.create(function(err){
			// TODO err
			console.error(err);
			$("#signmodal").modal("show");
		});
	} else {
		app.join(function(err, firstTime){
			// TODO err
			if(err){
				errormodal.modal("show");
			}
			console.error(err);
			if(firstTime || !app.getNick()){
				$("#signmodal").modal("show");
			} else { // already loggged in
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

		console.log("Userlist update", users);

		$("#online-count").html(users.length);
		$("[title]", userList).tooltip("destroy");
		userList.empty();

		var me = _.find(users, function(user) {
			return user.nick === app.getNick()
		});

		users.forEach(function (user) {
			userList.append(gui.createUserElement(user, me));
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
		window.open(location.toString().split("#")[0]);
	});
	$("#save-button, #save-button-neterror").click(function() {
		$("#savemodal").modal("show");
	});
	$('#savemodal .save-file').click(function() {
		console.log('click');
		var fileType = $(this).attr('data-type');
		draw.getBlob(fileType, function(blob) {
			var time = (new Date()).toISOString().split('.')[0];
			saveAs(blob, "teamdraw." + time + "." + fileType);
			$("#savemodal").modal("hide");
		});
	})


	/* modals on show events */

	$("#signmodal").on("shown.bs.modal", function(){
		console.log("sign modal");
		$("#nick").focus();
		if(localStorage["nick"]){
			$("#nick").val(localStorage["nick"]);
		}
		$("#signmodal form").submit(function(event){
			event.preventDefault();
			var nick = $("#signmodal #nick").val();
			app.login(nick, function(err){
				console.error(err);
				if(err === null){
					console.log("nick ok");
					$("#signmodal").modal("hide");
					if (localStorage.firstRun === undefined) {
						$("#helpmodal").modal("show");
						localStorage.firstRun = false;
					}
				} else {
					$("#nickgroup").addClass("has-error");
					$("#nick").val("");
					$("#nick").attr("placeholder", err);
					console.log("Invalid Nick");
				}
			});
		});
	});

	$("#sharemodal").on("shown.bs.modal", function(){
		console.log("share modal");
		var link = location.toString().split("#")[0] + "#" + app.getToken();
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


	/* toolbar */

	$(".btn-tool[data-tool]").click(function() {
		draw.changeToolTo($(this).attr("data-tool"));
	});


	/* other events */

	app.on("logged on", function(){

		$("#share-button").addClass("btn-warning-c");

		app.sync();

		draw.changeToolTo("pencil");

		draw.setColor("#333");
		draw.setSize(2);


		window.onbeforeunload = function(){
			app.save();
		};

		// key bindings
		$(window).keydown(function(event){
			if(draw.getCurrentToolName() !== "text") {
				switch(event.keyCode){
					case KeyCode.KEY_S:
						draw.changeToolTo("selector");
						break;
					case KeyCode.KEY_P:
						draw.changeToolTo("pencil");
						break;
					case KeyCode.KEY_B:
						draw.changeToolTo("brush");
						break;
					case KeyCode.KEY_E:
						draw.changeToolTo("eraser");
						break;
					case KeyCode.KEY_M:
						draw.changeToolTo("move");
						break;
					case KeyCode.KEY_C:
						switch (draw.getCurrentToolName()) {
							case 'bucket':
								draw.changeToolTo("eyedropper");
								break;
							case 'eyedropper':
								draw.changeToolTo("bucket");
								break;
							default:
								draw.changeToolTo(["bucket", "eyedropper"][Math.floor(Math.random()*2)]);
						}
						break;
					case KeyCode.KEY_L:
						draw.changeToolTo("line");
						break;
					case KeyCode.KEY_A:
						draw.changeToolTo("arrow");
						break;
					case KeyCode.KEY_O:
						draw.changeToolTo("oval");
						break;
					case KeyCode.KEY_H:
						draw.changeToolTo("heart");
						break;
					case KeyCode.KEY_R:
						draw.changeToolTo("rectangle");
						break;
					case KeyCode.KEY_T:
						draw.changeToolTo("text");
						event.preventDefault();
						break;

					case KeyCode.KEY_DELETE:
						draw.deleteSelected();
						break;
					case KeyCode.KEY_ESCAPE:
						draw.unselectAll();
						break;

					case KeyCode.KEY_TAB:
						// todo hide all gui
						event.preventDefault();
						break;

					case KeyCode.KEY_LEFT:
						draw.moveSelected("left");
						break;
					case KeyCode.KEY_UP:
						draw.moveSelected("up");
						break;
					case KeyCode.KEY_RIGHT:
						draw.moveSelected("right");
						break;
					case KeyCode.KEY_DOWN:
						draw.moveSelected("down");
						break;

					case KeyCode.KEY_PAGE_UP:
						draw.zoom(+1);
						break;
					case KeyCode.KEY_PAGE_DOWN:
						draw.zoom(-1);
						break;
				}
			} else {
				if(event.keyCode === KeyCode.KEY_ESCAPE) {
					draw.changeToolTo("selector");
				}
			}
		});

		// wheel scroll
		$(window).on("mousewheel", function(e){
			draw.zoom(e.deltaY, {x: e.clientX, y: e.clientY});
		});

		toggleToolWhileHoldingKey("move", KeyCode.KEY_SPACE, ["text"]);
		toggleToolWhileHoldingKey("eyedropper", KeyCode.KEY_ALT, ["text", "selector", "move", "eraser"]);

		toggleToolWhileHoldingMouseButton("move", Button.RIGHT);


		function toggleToolWhileHoldingKey (toolname, keyCode, exceptions) {
			var prevToolName = "";
			var pressed = false;
			$(window).keydown(function(event){
				if (_.includes(exceptions.concat(toolname), draw.getCurrentToolName())) {
						return;
					}
				if (event.keyCode === keyCode && !pressed) {
					event.preventDefault();
					pressed = true;
					prevToolName = draw.getCurrentToolName();
					draw.changeToolTo(toolname);
				}
			})
			$(window).keyup(function(event){
				if(event.keyCode === keyCode && pressed) {
					if (toolname !== draw.getCurrentToolName()) {
						return;
					}
					event.preventDefault(); // prevent spacebar to select outlined tool
					draw.changeToolTo(prevToolName);
					pressed = false;
				}
			});
		}

		function toggleToolWhileHoldingMouseButton (toolname, button) {
			var prevToolName = "";
			$('body').on("mousedown", function(event){
				console.log("body mousedown");
			});
			$('#canvas').mousedown(function(event) {
				console.log("down", event.which);
				if(event.which === button) {
					prevToolName = draw.getCurrentToolName();
					draw.changeToolTo(toolname);
				}
			})
			$('#canvas').mouseup(function(event) {
				console.log("up", event.which);
				if(event.which === button) {
					draw.changeToolTo(prevToolName);
				}
			});
		}

		$('#workarea').contextmenu(function(event) {
			event.preventDefault();
		});

	}); // on logged on



});
