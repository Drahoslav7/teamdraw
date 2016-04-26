
var draw = new(function Draw(){

	var console = new Logger("draw");

	var _canvas;
	var _ctx;

	var _currentToolName = '';

	var _color;
	var _size;

	var _tools = {};

	var _objects = [];

	/* init */
	$(function(){
		_canvas = $("#canvas");
		paper.setup(_canvas[0]);

		paper.view.onResize = function(event){
			paper.view.scrollBy([-event.delta.width/2, - event.delta.height/2]);
		};

		draw.setColor('#333');
		draw.setSize(2);
	});

	function erase(item) {
		if (item.visible) { // prevent from multiple delete action on one item
			item.visible = false;
			app.postAction("erase", item.n);
		}
	}

	function filterByN(f_n) {
		return {
			n: function(i_n){
				if(typeof f_n === "number"){
					return f_n === i_n;
				}
				if(f_n instanceof Array){
					return f_n.some(function(f_n){
						return f_n === i_n;
					});
				}
			}
		}
	}

	function getItemsNearPoint (point) {
		var r = 4; // radius
		return paper.project.getItems({
			n: function(n){
				return n !== undefined;
			}
		}).filter(function(item) {
			return item.getNearestPoint(point).isClose(point, r);
		});
	};

	/** tools behavior definitions **/

	// selector
	(function(){
		var selector = new paper.Tool();
		_tools.selector = selector;
		var path;
		selector.onMouseDown = selector.onMouseDrag = function(event){
			if(!event.modifiers.control && event.type !== 'mousedrag'){
				paper.project.deselectAll();
			}
			getItemsNearPoint(event.point).forEach(function(item){
				item.selected = true;
			});
			paper.view.draw();
		}
	})();

	// pencil
	(function(){
		var pencil = new paper.Tool();
		_tools.pencil = pencil;
		pencil.minDistance = 1;
		// pencil.maxDistance = 5;
		var path;
		pencil.onMouseDown = function(event){
			path = new paper.Path({
				strokeCap: 'round',
				strokeJoin: 'round',
				strokeColor: _color,
				strokeWidth: _size,
			});
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
	})();

	// line
	(function(){
		var line = new paper.Tool();
		_tools.line = line;
		var path;
		line.onMouseDown = function(event){
			path = new paper.Path({
				strokeCap: 'round',
				strokeJoin: 'round',
				strokeColor: _color,
				strokeWidth: _size,
			});
			path.add(event.point);
			path.add(event.point);
		};
		line.onMouseDrag = function(event){
			path.removeSegment(1);
			path.add(event.point);
		};
		line.onMouseUp = function(event){
			var cachepath = path;
			app.postAction("path", path.exportJSON({toString:false}));
			setTimeout(function(){
				cachepath.remove(); // will be replaced with update from server
				paper.view.draw();
			}, 200);
		};		
	})();

	// rectangle
	(function(){
		var rectangle = new paper.Tool();
		_tools.rectangle = rectangle;
		var path;
		var from;
		rectangle.onMouseDown = function(event){
			from = event.point;
			path = new paper.Path.Rectangle({
				from: from,
				to: from,
				strokeCap: 'round',
				strokeJoin: 'round',
				strokeColor: _color,
				strokeWidth: _size,
			});
		};
		rectangle.onMouseDrag = function(event){
			var to = event.point;
			path.removeSegments(1); // all except first
			path.addSegments([
				{x: to.x, y: from.y},
				to,
				{x: from.x, y: to.y},
			]);
		}
		rectangle.onMouseUp = function(event){
			app.postAction("path", path.exportJSON({toString:false}));
			setTimeout(function(){
				path.remove(); // will be replaced with update from server
				paper.view.draw();
			}, 200);
		};
	})();


	// eyedropper
	(function(){
		var eyedropper = new paper.Tool();
		_tools.eyedropper = eyedropper;
		var path;

		eyedropper.onMouseDown = function(event){
			var items = getItemsNearPoint(event.point);
			items.some(function(item){
				draw.setColor(item.strokeColor.toCSS());
				return true;
			});
		};

		eyedropper.onMouseMove = function(event){ // hover
			paper.project.deselectAll();
			getItemsNearPoint(event.point).some(function(item){
				return item.selected = true;
			});
			paper.view.draw();
		};

	})();

	// eraser
	(function(){
		var eraser = new paper.Tool();
		_tools.eraser = eraser;
		var path;

		eraser.onMouseDown = eraser.onMouseDrag = function(event){
			getItemsNearPoint(event.point).forEach(function(item){
				erase(item);
			});
			paper.view.draw();
		};
		eraser.onMouseMove = function(event){ // hover
			paper.project.deselectAll();
			getItemsNearPoint(event.point).forEach(function(item){
				item.selected = true;
			});
			paper.view.draw();
		}
	})();

	// move
	(function(){
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
	})();


	//// end of tools behavior definitions

	app.on("update", function(action){
		if(action.type === "path"){
			var item = new paper.Path();
			var parent = item.getParent();
			item.remove();
			item.importJSON(action.data);
			item.setParent(parent);
			item.n = action.n; // for deleting and manipulation purposes
		}
		if(action.type === "erase"){
			var n = action.data;
			var item = paper.project.getItem(filterByN(n));
			if(!item){
				console.error("nothing with n=%d to erase", action.n);
			} else {
				item.remove();
			}
		}
		if(action.type === "translate"){
			var ns = action.data.ns;
			var delta = new paper.Point(action.data.delta);
			paper.project.getItems(filterByN(ns)).forEach(function(item){
				item.translate(delta);
			});
		}
		paper.view.draw();
	});

	// init end


	this.selectTool = function(toolname){
		if(toolname in _tools){
			_tools[toolname].activate();
			_currentToolName = toolname;
			gui.changeCursor(toolname);
			gui.highlightTool(toolname);
			console.log('tool changed to', toolname);
		} else {
			console.error("unknown tool", toolname)
		}
	}

	this.setColor = function(color){
		_color = color;
		gui.setColorOfPicker(color);
	}

	this.setSize = function(size){
		_size = size;
	}

	this.deleteSelected = function(){
		paper.project.selectedItems.forEach(function(item){
			erase(item);
		});
		paper.view.draw();
	};

	this.moveSelected = function(dirrection) { // todo make universal
		var x = 0;
		var y = 0;
		var step = 5;
		if(paper.Key.isDown('control')) { // fast
			step *= 5;
		}
		if(paper.Key.isDown('shift')) { // slow
			step /= 5;
		}
		switch(dirrection){
			case 'up':
				y -= step; break;
			case 'down':
				y += step; break;
			case 'left':
				x -= step; break;
			case 'right':
				x += step; break;
		}
		var delta = new paper.Point(x,y);
		var itemNumbers = [];
		paper.project.selectedItems.forEach(function(item){
			itemNumbers.push(item.n);
		});
		app.postAction('translate', {
			ns: itemNumbers,
			delta: {x:x, y:y}
		});
	};

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