
var draw = new(function Draw(){

	var log = new tool.logger("draw");

	var _canvas;
	var _ctx;

	var _currentToolName = '';

	var _color = '#333';
	var _size = 2;

	var _tools = {};

	var _objects = [];

	// init
	$(function(){

		_canvas = $("#canvas");
		paper.setup(_canvas[0]);

		paper.view.onResize = function(event){
			paper.view.scrollBy([-event.delta.width/2, - event.delta.height/2]);
		}

		/** tools behavior **/
		var path;

		function getItemsNearPoint (point) {
			var r = 3; // radius
			var circle = new paper.Path.Circle(point, r);
			circle
			return paper.project.getItems({
				n: function(n){
					return n !== undefined;
				}
			}).filter(function(item) {
				console.log(item);
				return circle.intersects(item);
			});
		}


		// pointer
		var pointer = new paper.Tool();
		_tools.pointer = pointer;
		pointer.onMouseDown = pointer.onMouseDrag = function(event){
			if(!event.modifiers.control && event.type !== 'mousedrag'){
				// unselect
				paper.project.selectedItems.forEach(function(item){
					item.selected = false;
				});
			}
			getItemsNearPoint(event.point).forEach(function(item){
				item.selected = true;
			});
			paper.view.draw();
		}


		// pencil
		var pencil = new paper.Tool();
		_tools.pencil = pencil;
		// pencil.minDistance = 5;
		// pencil.maxDistance = 5;
		pencil.onMouseDown = function(event){
			path = new paper.Path();
			path.strokeCap = 'round';
			path.strokeJoin = 'round';
			_objects.push(path);
			path.strokeColor = _color;
			path.strokeWidth = _size;
			path.add(event.point);
		};
		pencil.onMouseDrag = function(event){
			path.add(event.point);
		};
		pencil.onMouseUp = function(event){
			if(path.segments.length === 1) { // is dot
				var point = path.segments[0].point;
				var circle = new paper.Path.Circle(point, path.strokeWidth/4);
				circle.strokeColor = path.strokeColor;
				circle.strokeWidth = path.strokeWidth/2;
				path.remove();
				path = circle;
			}
			var cachepath = path;
			app.postAction("path", path.exportJSON({toString:false}));
			setTimeout(function(){
				cachepath.remove(); // will be replaced with update from server
				paper.view.draw();
			}, 200);
		};

		// rectangle
		var rectangle = new paper.Tool();
		_tools.rectangle = rectangle;
		var start;
		rectangle.onMouseDown = function(event){
			start = event.point;
		};
		rectangle.onMouseUp = function(event){
			var path = new paper.Path.Rectangle(start, event.point);
			path.strokeCap = 'round';
			path.strokeJoin = 'round';
			path.strokeColor = _color;
			path.strokeWidth = _size;
			_objects.push(path);
			app.postAction("path", path.exportJSON({toString:false}));
			setTimeout(function(){
				path.remove(); // will be replaced with update from server
				paper.view.draw();
			}, 200);
		};


		// eraser
		var eraser = new paper.Tool();
		_tools.eraser = eraser;
		eraser.onMouseDown = eraser.onMouseDrag = function(event){
			getItemsNearPoint(event.point).forEach(function(item){
				if (item.visible) { // prevent from multiple delete action on one item
					item.visible = false;
					app.postAction("erase", item.n);
				}
			});
			paper.view.draw();
		};
		eraser.onMouseMove = function(event){ // hover
			paper.project.selectedItems.forEach(function(item){
				item.selected = false;
			});
			getItemsNearPoint(event.point).forEach(function(item){
				item.selected = true;
			});
			paper.view.draw();
		}


		// move
		var move = new paper.Tool();
		_tools.move = move;
		move.onMouseDown = function (event) {
			move.pos = {
				deltaX: 0,
				deltaY: 0,
			};
		};
		move.onMouseDrag = function (event){
			move.pos.deltaX += event.delta.x;
			move.pos.deltaY += event.delta.y;
			paper.view.scrollBy([-move.pos.deltaX, -move.pos.deltaY]);
			paper.view.draw();
		};


		/////////// end of tools behavior definitions

		app.on("update", function(action){
			// log("update", action.n, action);
			if(action.type === "path"){
				var item = new paper.Path();
				item.importJSON(action.data);
				item.n = action.n; // for deleting purposes
			}
			if(action.type === "erase"){
				var item = paper.project.getItem({
					n: action.data
				})
				if(!item){
					console.error("nothing with n=%d to erase", action.n);
				} else {
					item.remove();
				}
			}
			paper.view.draw();
		});



	}); // init end



	this.selectTool = function(toolname){
		if(toolname in _tools){
			_tools[toolname].activate();
			_currentToolName = toolname;
			gui.changeCursor(toolname);
			log('tool changed to', toolname);
		} else {
			console.error("unknown tool", toolname)
		}
	}

	this.setColor = function(color){
		$("#tool-outer-color").css({color: color});
		_color = color;
	}

	this.setSize = function(size){
		_size = size;
	}

	// this.deleteSelected = function(){
	// 	paper.project.selectedItems.forEach(function(item){
	// 		item.remove();
	// 	});
	// 	paper.view.draw();
	// };

	this.getCurrentToolName = function(){
		return _currentToolName;
	};


	// var _undoned = [];
	// this.undo = function(){
	// 	var item = _objects.pop();
	// 	if(item){
	// 		item.visible = false;
	// 		paper.view.draw();
	// 		_undoned.push(item);
	// 	}
	// }

	// this.redo = function(){
	// 	var item = _undoned.pop();
	// 	if(item){
	// 		_objects.push(item)
	// 		item.visible = true;
	// 		paper.view.draw();
	// 	}
	// };

	this.getUrl = function(){
		var svg = paper.project.exportSVG({asString:true});
		//add xml declaration
		svg = '<?xml version="1.0" standalone="yes"?>\r\n' + svg;
		//convert svg source to URI data scheme.
		var url = "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);
		return url;
	}

});