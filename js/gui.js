$(function () {


	var menubutton = $("#menubutton");
	var sharebutton = $("#sharebutton");
	var menu = $("#menu");
	menu.visible = false;

	menubutton.click(function () {
		if (menu.visible) {
			sharebutton.removeClass("btn-sharebutton-open");
			menu.animate({width: 0},function(){
				menubutton.html("Menu ▶");
				menubutton.removeClass("btn-menubutton-open");
			});
			menu.visible = false;
		} else	{
			var resWidth =  $("#top").width() - $("#menubutton").outerWidth() - $("#sharebutton").outerWidth();
			menubutton.addClass("btn-menubutton-open");
			menu.animate({width: resWidth}, function(){
				menubutton.html("Menu ◀");
				sharebutton.addClass("btn-sharebutton-open");
			});
			menu.visible = true;
		}
	});
});
