var gui = new (function () {

	var menubutton;
	var menu;

	var toolbarbutton;
	var toolmenu;

	var errormodal;

	var sharebutton;
	var userlistbutton;
	var usermenu;
	var usertext;

	this.userListResize = function (doNotToggle) {
		if (usermenu.visible && !doNotToggle) {
			usermenu.animate({height: 0}, function() {
				usertext.html("");
				userlistbutton.removeClass("btn-userlistbutton-open");
				$("#userbarholder").animate({marginRight: 8});
				userlistbutton.animate({width: 100});
			});
			usermenu.visible = false;
		} else if ((!doNotToggle && !usermenu.visible) || (doNotToggle && usermenu.visible)) {
			var resHeight = $("#user-list").height();
			$("#userbarholder").animate({marginRight: 108});
			userlistbutton.addClass("btn-userlistbutton-open");
			userlistbutton.animate({width: 200}, function() {
				usertext.html(" User List");
				usermenu.animate({height: resHeight});
			});
			usermenu.visible = true;
		}
	};

	this.toolBarResize = function () {
		if (toolmenu.visible) {
			toolmenu.animate({height: 0}, function() {
				//usertext.html("");
				toolbarbutton.removeClass("btn-userlistbutton-open");
			});
			toolmenu.visible = false;
		} else {
			var resHeight = $("#tool-list").height();
			toolbarbutton.addClass("btn-userlistbutton-open");
			toolmenu.animate({height: resHeight}, function() {
				//usertext.html(" User List");
			});
			toolmenu.visible = true;
		}
	};

	this.menuResize = function () {
		if (menu.visible) {
			menu.animate({width: 0}, function() {
				menubutton.html("Menu ▶");
				menubutton.removeClass("btn-menubutton-open");
				menu.visible = false;
			});
		} else	{
			var resWidth = $("#save-button").outerWidth(true) + $("#new-button").outerWidth(true) + $("#help-button").outerWidth(true);
			menubutton.addClass("btn-menubutton-open");
			menu.animate({width: resWidth}, function(){
				menubutton.html("Menu ◀");
				menu.visible = true;
			});
		}
	}

	$(function () {

		menubutton = $("#menubutton");
		menu = $("#menu");
		menu.visible = false;

		toolbarbutton = $("#toolbarbutton");
		toolmenu = $("#toolbarmenu");

		errormodal = $("#errormodal");

		sharebutton = $("#sharebutton");
		userlistbutton = $("#userbutton");
		usermenu = $("#usermenu");
		usertext = $("#usertext");
		usermenu.visible = false;

		userlistbutton.click(function () {
			gui.userListResize();
		});

		menubutton.click(function () {
			gui.menuResize();
		});

		toolbarbutton.click(function () {
			gui.toolBarResize();
		});
	});
});
