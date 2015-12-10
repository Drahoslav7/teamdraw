var gui = new (function () {

	var menubutton;
	var menu;

	var toolbarbutton;
	var toolmenu;
	
	var userbarbutton;
	var usermenu;

	var errormodal;

	var sharebutton;

	this.userListResize = function (doNotToggle) {

		if (usermenu.visible && !doNotToggle) {
			var resHeight = userbarbutton.outerHeight();
			$("#userbar").animate({width: '100px', height: resHeight }, function () {
				userbarbutton.removeClass("userbarbutton-open");
			});
			userbarbutton.usertext.html("");
			usermenu.visible = false;
		} else if ((!doNotToggle && !usermenu.visible) || (doNotToggle && usermenu.visible)) {
			resHeight = usermenu.outerHeight() + userbarbutton.outerHeight();
			$("#userbar").animate({ width: '200px', height: resHeight  }, function () {
				userbarbutton.usertext.html(" User List");
			});
			userbarbutton.addClass("userbarbutton-open");
			usermenu.visible = true;
		}
	};

	this.toolBarResize = function () {
		if (toolmenu.visible) {
			var resHeight = toolbarbutton.outerHeight();
			$("#toolbar").animate({ width: '100px', height: resHeight }, function () {
				toolbarbutton.removeClass("toolbarbutton-open");
			});
			
			toolbarbutton.html("Tools");
			
			toolmenu.visible = false;
		} else {
			resHeight = toolmenu.outerHeight() + toolbarbutton.outerHeight();
			$("#toolbar").animate({ width: '50px', height: resHeight });
			
			toolbarbutton.addClass("toolbarbutton-open");
			toolbarbutton.html("◤")
			
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

	this.changeCursor = function(toolname){
		var icon = '';
		var options = {};
		switch(toolname){
			case 'pencil':
				icon = 'pencil';
				options.flip = 'vertical';
				break;
			case 'eraser':
				icon = 'eraser';
				options.flip = 'vertical';
				// options.hotsot = 'bottom left';
				break;
			case 'move':
				icon = 'arrows';
				break;
			default:
				$('#workarea').css('cursor','');
				return;
		}
		$('#workarea').awesomeCursor(icon, options);
	};

	$(function () {

		menubutton = $("#menubutton");
		menu = $("#menu");
		menu.visible = false;

		toolbarbutton = $("#toolbarbutton");
		toolmenu = $("#toolmenu");
		toolmenu.visible = true;
		
		userbarbutton = $("#userbarbutton");
		userbarbutton.usertext = $("#usertext");
		userbarbutton.onlinecount = $("#online-count");
		usermenu = $("#usermenu");
		usermenu.visible = true;

		errormodal = $("#errormodal");

		sharebutton = $("#sharebutton");
		

		userbarbutton.click(function () {
			gui.userListResize();
		});

		menubutton.click(function () {
			gui.menuResize();
		});

		toolbarbutton.click(function () {
			gui.toolBarResize();
		});
		
		$(function () {
			$('[data-toggle="tooltip"]').tooltip()
		})

		$(".btn-color-pallete").spectrum({
			showButtons: false,
			color: 'black',
			clickoutFiresChange: true,
			containerClassName: 'spectrum-custom',
			change: function(color) {
					draw.setColor(color.toHexString());
			},
			move: function(color) {
					draw.setColor(color.toHexString());
			},
			hide: function(color) {
					draw.setColor(color.toHexString());
			}
		});
	});
});
