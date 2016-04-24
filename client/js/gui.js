var gui = new (function () {

	var menubutton;
	var menu;

	var toolbarbutton;
	var toolmenu;

	var colorpicker;
	var ghostcolorpicker;
	var ghostboldnesspicker;
	
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
				userbarbutton.usertext.html(" User list");
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
	
	this.showBoldnessTool = function() {
		if (!ghostboldnesspicker.visible) {
			ghostboldnesspicker.animate({width: '150px'});
			ghostboldnesspicker.visible = true;
		};
	};
	
	this.hideBoldnessTool = function() {
		if (ghostboldnesspicker.visible) {
			ghostboldnesspicker.animate({width: 0});
			ghostboldnesspicker.visible = false;
		};
	};
	
	this.changeCursor = function(toolname){
		var icon = '';
		var options = {};
		switch(toolname){
			case 'selector':
				icon = 'mouse-pointer';
				break;
			case 'move':
				icon = 'arrows';
				break;
			case 'pencil':
				icon = 'pencil';
				options.flip = 'vertical';
				break;
			case 'eraser':
				icon = 'eraser';
				options.flip = 'vertical';
				// options.hotspot = 'bottom left';
				break;
			case 'rectangle':
				icon = 'square-o';
				break;
			default:
				$('#workarea').css('cursor','');
				return;
		}
		$('#workarea').awesomeCursor(icon, options);
	};

	this.highlightTool = function(toolname){
		$('.btn-tool').removeClass('selected');
		$('.btn-tool').filter(function(i, el){
			return $(el).attr('data-tool') === toolname;
		}).addClass('selected');
	};

	this.setColorOfPicker = function(color){
		$("#tool-color").css({color: color});
		colorpicker.spectrum("set", color);
	};

	$(function () {

		menubutton = $("#menubutton");
		menu = $("#menu");
		menu.visible = false;

		toolbarbutton = $("#toolbarbutton");
		toolmenu = $("#toolmenu");
		toolmenu.visible = true;
		ghostboldnesspicker = $("#ghost-boldnesspicker");
		ghostboldnesspicker.visible = false;
		
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

		/**
		 * color picker
		 */

		ghostcolorpicker = $("#ghost-colorpicker");
		var posY = $("#tool-color").position().top;
		var posX = $("#tool-color").outerWidth(true);
		ghostcolorpicker.css({top: posY -50 +2, left: posX + 20});
		ghostcolorpicker.hide();
		
		colorpicker = $('<input>');
		colorpicker.appendTo(ghostcolorpicker);
		colorpicker.spectrum({
			showButtons: false,
			flat: true,
			containerClassName: 'spectrum-custom',
			move: function(color) {
				draw.setColor(color.toHexString());
			}
		});
		
		$("#tool-color").on('mousedown', function toggle() {
			var aroundpicker = $(':not(#ghost-colorpicker *)');
			if(!ghostcolorpicker.is(':visible')) {
				$("#tool-color").off('mousedown', toggle);
				ghostcolorpicker.show(50, function(){
					colorpicker.spectrum("show"); // bugfix, spectrum won't properly update otherwise
					aroundpicker.on("mousedown", hide);
				});
			}
			function hide(e){
				e.stopPropagation();
				aroundpicker.off("mousedown", hide);
				ghostcolorpicker.hide(50, function(){
					colorpicker.spectrum("hide");
					$("#tool-color").on('mousedown', toggle);
				});
			}
		});

	});
});
