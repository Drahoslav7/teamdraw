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
			$("#userbar").animate({height: resHeight}, function () {
				userbarbutton.removeClass("userbar-button-open");
			});
			userlist.visible = false;
		} else if ((!doNotToggle && !userlist.visible) || (doNotToggle && userlist.visible)) { // show
			resHeight = userlist.outerHeight() + userbarbutton.outerHeight();
			$("#userbar").animate({height: resHeight}, function () {
			});
			userbarbutton.addClass("userbar-button-open");
			userlist.visible = true;
		}
	};

	this.toolBarResize = function () {
		var resHeight;
		if (toollist.visible) {
			resHeight = toolbarbutton.outerHeight();
			$("#toolbar").animate({height: resHeight}, function() {
				toolbarbutton.removeClass("toolbar-button-open");
				$(this).addClass("closed");
			});
			toolbarbutton.html("◢");
			
			toollist.visible = false;
		} else {
			resHeight = toollist.outerHeight() + toolbarbutton.outerHeight();
			$("#toolbar").animate({height: resHeight}, function() {
				$(this).removeClass("closed");
			});
			toolbarbutton.html("◤")
			
			toolbarbutton.addClass("toolbar-button-open");
			
			toollist.visible = true;
		}
	};

	this.menuResize = function () {
		if (menu.visible) {
			menu.animate({width: 0}, function() {
				menubutton.removeClass("btn-menubutton-open");
				menu.visible = false;
			});
		} else	{
			var resWidth = $("#save-button").outerWidth(true) + $("#new-button").outerWidth(true) + $("#help-button").outerWidth(true);
			menubutton.addClass("btn-menubutton-open");
			menu.animate({width: resWidth}, function(){
				menu.visible = true;
			});
		}
	}
	
	this.showBoldnessTool = function() {
		if (!ghostboldnesspicker.visible) {
			ghostboldnesspicker.animate({width: '150px'}, 150);
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
		var icon = '';
		var options = {};
		switch(toolname){
			case 'selector':
				icon = 'cursor-default';
				break;
			case 'move':
				icon = 'cursor-move';
				break;
			case 'pencil':
				icon = 'pencil';
				options.flip = 'vertical';
				break;
			case 'eraser':
				icon = 'eraser';
				options.flip = 'vertical';
				break;
			case 'eyedropper':
				icon = 'eyedropper';
				options.flip = 'vertical';
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


	this.createUserElement = function(user) {
		var userElement = $("<div class='user'></div>");
		var penciltoggler = $("<i class='mdi mdi-pencil'></i>");
		var userIco = $("<i class='mdi mdi-account'></i>");
		penciltoggler.hover(function() {
			$(this).toggleClass("mdi-pencil mdi-pencil-off");
		}, function() {
			$(this).toggleClass("mdi-pencil mdi-pencil-off");
		});
		userElement.attr("title", user);
		if(user === app.getNick()) {
			userElement.addClass("mySelf");
			userIco.toggleClass("mdi-account mdi-account-star")
		}
		userElement.append(userIco);
		userElement.append(penciltoggler);
		userElement.tooltip({
			animation: false,
			placement: "left",
			container: "body",
		});
		return userElement;
	};

	$(function () {

		$.fn.awesomeCursor.defaults.size = 20;
		$.fn.awesomeCursor.defaults.hotspot = [2, 2];
		$.fn.awesomeCursor.defaults.font = {
			family: 'Material Design Icons',
			cssClass: 'mdi mdi-%s'
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
		$('[title]').map(function(i, el){
			var title = $(this).attr("title");
			title = title.replace(/\((.)\)/, "<u>$1</u>");
			$(this).attr("title", title);
			$(this).tooltip({
				html: true,
				placement: "auto right",
				delay: {show: 500, hide: 0},
				container: "body",
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
			var posX = $("#tool-boldness").offset().top - ($("#ghost-boldnesspicker").outerHeight() - $("#tool-boldness").outerHeight())/2;
			var posY = $("#tool-boldness").outerWidth(true);
			$("#ghost-boldnesspicker").css({top: posX , left: posY+20});

			$("#tool-boldness").click(function() {
				gui.showBoldnessTool();
			});

			$(".btn-boldness-tool").click(function() {
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
					ghostcolorpicker.show(150, function(){
						colorpicker.spectrum("show"); // bugfix, spectrum won't properly update otherwise
						aroundpicker.on("mousedown", hide);
					});
				}
				function hide(e){
					e.stopPropagation();
					aroundpicker.off("mousedown", hide);
					ghostcolorpicker.hide(150, function(){
						colorpicker.spectrum("hide");
						$("#tool-color").on('mousedown', toggle);
					});
				}
			});
		})();

	});
});
