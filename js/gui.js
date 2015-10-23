$(function () {
	var menubutton = $("#menubutton");
	var menu = $("#menu");
	menu.visible = false;

	menubutton.click(function () {
	if (menu.visible) {
		menu.animate({width: 0});
		menu.visible = false;
	} else	{
		menu.animate({width: 300});
		menu.visible = true;
	}
	});
});
