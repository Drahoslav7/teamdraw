$(function () {
	var menubutton = $("#menubutton");
	var menu = $("#menu");
	menu.visible = false;

	menubutton.click(function () {
		if (menu.visible) {
			menu.animate({width: 0},function(){
				menubutton.html("menu ▶");
			});
			menu.visible = false;
		} else	{
			var width =  $("#top").width() - $("#menubutton").outerWidth() - $("#sharebutton").outerWidth();
			menu.animate({width: width}, function(){
				menubutton.html("menu ◀");
			});
			menu.visible = true;
		}
	});
});
