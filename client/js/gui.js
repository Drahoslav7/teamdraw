var gui = new (function () {

	var menubutton;
	var menu;

	var toolbarbutton;
	var toollist;

	var userbarbutton;
	var userlist;

	var colorpicker;
	var ghostcolorpicker;
	var ghostboldnesspicker;

	this.isUserlistVisible = function () {
		return userlist.visible;
	};

	this.isToolListVisible = function () {
		return toollist.visible;
	}


	this.userListResize = function (doNotToggle) {

		if (userlist.visible && !doNotToggle) { // hide
			var resHeight = userbarbutton.outerHeight();
			$("#userbar").animate({height: resHeight});
			userlist.visible = false;
		} else if ((!doNotToggle && !userlist.visible) || (doNotToggle && userlist.visible)) { // show
			resHeight = userlist.outerHeight() + userbarbutton.outerHeight();
			$("#userbar").animate({height: resHeight});
			userlist.visible = true;
		}
	};

	this.toolBarResize = function () {
		var resHeight;
		if (toollist.visible) {
			resHeight = toolbarbutton.outerHeight();
			$("#toolbar").animate({height: resHeight});
			toolbarbutton.html("◢");

			toollist.visible = false;
		} else {
			resHeight = toollist.outerHeight() + toolbarbutton.outerHeight();
			$("#toolbar").animate({height: resHeight});
			toolbarbutton.html("◤")

			toollist.visible = true;
		}
	};

	this.menuResize = function () {
		if (menu.visible) {
			menu.animate({width: 0}, function() {
				menubutton.removeClass("open");
				menu.visible = false;
			});
		} else	{
			var resWidth = $("#save-button").outerWidth(true) + $("#new-button").outerWidth(true) + $("#help-button").outerWidth(true);
			menubutton.addClass("open");
			menu.animate({width: resWidth}, function(){
				menu.visible = true;
			});
		}
	}

	this.showBoldnessTool = function() {
		if (!ghostboldnesspicker.visible) {
			ghostboldnesspicker.animate({width: "150px"}, 150);
			ghostboldnesspicker.visible = true;
		} else {
			this.hideBoldnessTool();
		};
	};

	this.hideBoldnessTool = function() {
		if (ghostboldnesspicker.visible) {
			ghostboldnesspicker.animate({width: 0}, 150);
			ghostboldnesspicker.visible = false;
		};
	};

	this.changeCursor = function(toolname){
		var icon = "";
		var options = {};
		switch(toolname){
			case "selector":
				icon = "cursor-default";
				break;
			case "move":
				icon = "cursor-move";
				break;
			case "pencil":
				icon = "pencil";
				options.flip = "vertical";
				break;
			case "brush":
				icon = "brush";
				options.rotate = "90";
				break;
			case "eraser":
				icon = "eraser";
				options.flip = "vertical";
				break;
			case "eyedropper":
				icon = "eyedropper";
				options.flip = "vertical";
				break;
			default:
				$("#workarea").css("cursor","");
				return;
		}
		$("#workarea").awesomeCursor(icon, options);
	};

	this.highlightTool = function(toolname) {
		$(".btn-tool").removeClass("selected");
		$(".btn-tool").filter(function(i, el){
			return $(el).attr("data-tool") === toolname;
		}).addClass("selected");
	};

	this.setColorOfPicker = function(color) {
		$("#tool-color").css({color: color});
		colorpicker.spectrum("set", color);
	};

	var zoomTimeout;
	this.setZoomInfo = function(zoomLevel) {
		var zoomPercentage = Math.floor(zoomLevel*100);
		if (zoomPercentage === 100) {
			clearTimeout(zoomTimeout);
			zoomTimeout = setTimeout(function(){
				$("#zoom").hide(250);
			}, 400);
		} else {
			clearTimeout(zoomTimeout);
			setTimeout(function(){
				$("#zoom").show(250);
			}, 100);
		}
		$("#zoom").html(zoomPercentage+" %");
	}


	this.createUserElement = function(user, me) {

		var userElement = $("<div class='user'></div>");
		var penciltoggler = $("<i class='mdi'></i>");
		var userIco = $("<i class='mdi mdi-account'></i>");
		if (user.rights.toDraw) {
			penciltoggler.addClass('mdi-pencil');
		} else {
			penciltoggler.addClass('mdi-pencil-off');
		}

		if (me.rights.toChangeRights) {
			penciltoggler.hover(function() {
				$(this).toggleClass("mdi-pencil mdi-pencil-off");
			}, function() {
				$(this).toggleClass("mdi-pencil mdi-pencil-off");
			});
			penciltoggler.click(function() {
				app.toggleMuteToUser(user);
			});
		}
		userElement.attr("title", user.nick);
		if (user.nick === app.getNick()) {
			userElement.addClass("mySelf");
		}
		if (user.rights.toChangeRights) {
			userIco.toggleClass("mdi-account mdi-account-star")
		}
		userElement.append(userIco);
		userElement.append(penciltoggler);
		userElement.tooltip({
			animation: false,
			placement: "left",
			container: "#tooltips",
		});
		return userElement;
	};

	$(function () {

		// do not focus
		$('.btn-tool').focus(function (event) {
			event.target.blur();
		});

		/*
		 * modals seetings
		 */

		var preventClose = {
			"backdrop" : "static",
			"keyboard" : false,
			"show": false,
		};

		$("#signmodal").modal(preventClose);

		$("#errormodal").modal(preventClose);

		$("#neterrormodal").modal(preventClose);

		$("#helpmodal").modal({
			"backdrop" : false,
			"show": false,
		}).on("show.bs.modal", function() {
			$("[title]").tooltip("show");
			$("#workarea").animate({
				opacity: 0.2
			});
			gui.menuResize();
			if (!gui.isUserlistVisible()) {
				gui.userListResize();
			}
			if (!gui.isToolListVisible()) {
				gui.toolBarResize();
			}
			$(this).one("hide.bs.modal", function() {
				$("[title]").tooltip("hide");
				$("#workarea").animate({
					opacity: 1.0
				});
			});
		});

		/**
		 * Cursor presets
		 */

		$.fn.awesomeCursor.defaults.size = 20;
		$.fn.awesomeCursor.defaults.hotspot = [2, 2];
		$.fn.awesomeCursor.defaults.font = {
			family: "Material Design Icons",
			cssClass: "mdi mdi-%s"
		};

		menubutton = $("#menu-button");
		menu = $("#menu");
		menu.visible = false;

		toolbarbutton = $("#toolbar-button");
		toollist = $("#toollist");
		toollist.visible = true;
		ghostboldnesspicker = $("#ghost-boldnesspicker");
		ghostboldnesspicker.visible = false;

		userbarbutton = $("#userbar-button");
		userbarbutton.onlinecount = $("#online-count");
		userlist = $("#userlist");
		userlist.visible = true;


		userbarbutton.click(function () {
			gui.userListResize();
		});

		menubutton.click(function () {
			gui.menuResize();
		});

		toolbarbutton.click(function () {
			gui.toolBarResize();
		});


		userbarbutton.hover(function () {
			$(".user[title]").tooltip("show");
		}, function () {
			$(".user[title]").tooltip("hide");
		});

		/**
		 * tooltips
		 */
		$("[title]").map(function(i, el){
			var title = $(this).attr("title");
			title = title.replace(/\((.)\)/, "<u>$1</u>");
			$(this).attr("title", title);
			$(this).tooltip({
				html: true,
				placement: "auto right",
				delay: {show: 500, hide: 0},
				container: "#tooltips",
				trigger: "hover"
			}).click(function(){
				$(this).tooltip("hide");
			});
		});

		userbarbutton.tooltip("destroy").tooltip({
			container: "body",
			placement: "left",
			trigger: "manual"
		});
		/**
		 * boldnes picker
		 */
		(function(){
			var posX = $("#tool-boldness").offset().top;
			var posY = $("#tool-boldness").outerWidth(true);
			$("#ghost-boldnesspicker").css({top: posX , left: posY+20});

			$("#tool-boldness").on("click", function show(e) {
				var aroundpicker = $(":not(#ghost-boldnesspicker *)");
				$("#tool-boldness").off("click", show);
				gui.showBoldnessTool();
				setTimeout(function() {
					aroundpicker.on("click", hide);
				});
				function hide (e) {
					gui.hideBoldnessTool();
					aroundpicker.off("click", hide);
					setTimeout(function() {
						$("#tool-boldness").on("click", show);
					});
				}
			});

			$(".btn-boldness-tool").on("click", function() {
				var boldness = $(this).attr("data-size");
				draw.setSize(1<<boldness);
				gui.hideBoldnessTool();
			});

		})();

		/**
		 * color picker
		 */
		(function(){
			ghostcolorpicker = $("#ghost-colorpicker");
			var posY = $("#tool-color").position().top;
			var posX = $("#tool-color").outerWidth(true);
			ghostcolorpicker.css({top: posY -50 +11, left: posX + 20});
			ghostcolorpicker.hide();

			colorpicker = $("<input>");
			colorpicker.appendTo(ghostcolorpicker);
			colorpicker.spectrum({
				showButtons: false,
				flat: true,
				containerClassName: "spectrum-custom",
				move: function(color) {
					draw.setColor(color.toHexString());
				}
			});

			$("#tool-color").on("click", function toggle() {
				var aroundpicker = $(":not(#ghost-colorpicker *)");
				if(!ghostcolorpicker.is(":visible")) {
					$("#tool-color").off("click", toggle);
					ghostcolorpicker.show(150, function(){
						colorpicker.spectrum("show"); // bugfix, spectrum won"t properly update otherwise
						aroundpicker.on("click", hide);
					});
				}
				function hide(e){
					aroundpicker.off("click", hide);
					ghostcolorpicker.hide(150, function(){
						colorpicker.spectrum("hide");
						$("#tool-color").on("click", toggle);
					});
				}
			});
		})();

	});
});
