/* ========== MAIN ========== */

$(function(){

	$("#signmodal").modal({
		"backdrop" : "static",
		"keyboard" : false
	});

	// init
	if(location.hash === "" || location.hash === "#") {
		app.create(function(err){
			// TODO err
		});
	} else {
		app.join(function(err){
			// TODO err
		});
	}

	$("#signmodal").modal("show"); // new instance
	

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
	$("#area").click(function(){
		tool.log("area clicked");
	});


	/* modals on show events */

	$("#signmodal").on("shown.bs.modal", function(){
		tool.log("sign modal");
		$("#nick").focus();
		$("#signmodal form").submit(function(event){
			event.preventDefault();
			var nick = $("#signmodal #nick").val();
			app.login(nick, function(err){
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

	$("#helpmodal").on("shown.bs.modal", function(){
		tool.log("help modal");
		$("#helpmodal .btn-primary").click(function(){
			$("#helpmodal").modal("hide");
		});
	});

});
