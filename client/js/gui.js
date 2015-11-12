$(function () {


	var menubutton = $("#menubutton");
	var sharebutton = $("#sharebutton");
	var menu = $("#menu");
	menu.visible = false;


	menubutton.click(function () {
		if (menu.visible) {
			menu.animate({width: 0}, function(){
				menubutton.html("Menu ▶");
				menubutton.removeClass("btn-menubutton-open");
			});
			menu.visible = false;
		} else	{
			var resWidth = $("#save-button").outerWidth(true) + $("#new-button").outerWidth(true) + $("#help-button").outerWidth(true);
			menubutton.addClass("btn-menubutton-open");
			menu.animate({width: resWidth}, function(){
				menubutton.html("Menu ◀");
			});
			menu.visible = true;
		}
	});
});
