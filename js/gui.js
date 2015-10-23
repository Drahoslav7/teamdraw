$(function () {
	var menubutton = $("#menubutton");
	var sharebutton = $("#sharebutton")
	var menu = $("#menu");
	menu.visible = false;

	menubutton.click(function () {
		if (menu.visible) {
			sharebutton.removeClass("btn-sharebutton-open");
			menu.animate({width: 0},function(){
				menubutton.html("menu ▶");
				menubutton.removeClass("btn-menubutton-open");
			});
			menu.visible = false;
		} else	{
			var width =  $("#top").width() - $("#menubutton").outerWidth() - $("#sharebutton").outerWidth();
			menubutton.addClass("btn-menubutton-open");
			menu.animate({width: width}, function(){
				menubutton.html("menu ◀");
				sharebutton.addClass("btn-sharebutton-open");
			});
			menu.visible = true;
		}
	});
});
