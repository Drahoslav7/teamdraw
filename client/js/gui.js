$(function () {


	var menubutton = $("#menubutton");
	//var sharebutton = $("#sharebutton");
	var menu = $("#menu");
	menu.visible = false;

	var userlistbutton = $("#userbutton");
	var usermenu = $("#usermenu");
	var usertext = $("#usertext");
	usermenu.visible = false;

	userlistbutton.click(function () {
		if (usermenu.visible) {
			usermenu.animate({height: 0}, function() {
				usertext.html("");
				userlistbutton.removeClass("btn-userlistbutton-open");
				$("#userbarholder").animate({marginRight: 8});
				userlistbutton.animate({width: 100});
			});
			usermenu.visible = false;
		} else {
			var resHeight = $("#user-list").height();
			$("#userbarholder").animate({marginRight: 108});
			userlistbutton.addClass("btn-userlistbutton-open");
			userlistbutton.animate({width: 200}, function() {
				usertext.html(" User List");
				usermenu.animate({height: resHeight});
			});
			usermenu.visible = true;
		}
	});

	menubutton.click(function () {
		if (menu.visible) {
			menu.animate({width: 0}, function() {
				menubutton.html("Menu ▶");
				menubutton.removeClass("btn-menubutton-open");
			});
			menu.visible = false;
		} else	{
			var resWidth = $("#save-button").outerWidth(true) + $("#new-button").outerWidth(true) + $("#help-button").outerWidth(true) + $("#debug-button").outerWidth(true);
			menubutton.addClass("btn-menubutton-open");
			menu.animate({width: resWidth}, function(){
				menubutton.html("Menu ◀");
			});
			menu.visible = true;
		}
	});
});
