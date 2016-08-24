
var draw = new(function Draw(){

	var console = new Logger("draw");

	var _canvas;
	var _ctx;

	var _currentToolName = '';

	var _color;
	var _size;

	var _tools = {};

	var _objects = [];

	var _textItem;

	/* init */
	$(function(){
		_canvas = $("#canvas");
		paper.setup(_canvas[0]);
		paper.view.scrollBy([-paper.view.center.x, -paper.view.center.y]); // center fisrt
		paper.view.onResize = function(event){
			paper.view.scrollBy([-event.delta.width/2, - event.delta.height/2]);
		};

		_textItem = new paper.PointText({
			// fontFamily: 'Courier New',
			fontSize: 20
		});

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
		var radius = 4;
		return paper.project.getItems({
			n: function(n){
				return n !== undefined;
			}
		}).filter(function(item) {
			if(item instanceof paper.Path){
				return item.getNearestPoint(point).isClose(point, radius);
			}
			if(item instanceof paper.PointText){
				return item.bounds.contains(point);
			}
		});
	};

	/**
	 * return end point aligned to multiple of angle relative to start
	 * @param  {Point} start  first point of vector
	 * @param  {Point} end    point of vector, this will be aligned
	 * @param  {number} angle [description]
	 * @param  {number} offset angle default 0
	 * @return {Point}       aligned end point relative to start
	 */
	function alignToAngle(start, end, angle, offset) {
		offset = offset || 0;
		var vector = end.subtract(start);
		var vangle = (vector.angle + 360) % 360;
		var deviation = vangle % angle;
		if (deviation >= angle/2 + offset) {
			deviation = deviation-angle;
		}
		return end.rotate(-deviation+offset, start);
	}


	/**
	 * tools behavior definitions
	 */

	_tools["selector"] = (function(){
		var selector = new paper.Tool();
		var path;
		var willShift = false;
		selector.onMouseDown = selector.onMouseDrag = function(event){
			if(event.type === 'mousedown'){
				if(getItemsNearPoint(event.point).some(function(item) { // clicked at selected item
					return item.selected === true;
				})){
					willShift = true;
				}
			}
			if(!willShift){ // selecting
				if(!event.modifiers.control && event.type === 'mousedown'){
					paper.project.deselectAll();
				}
				getItemsNearPoint(event.point).forEach(function(item){
					item.selected = true;
				});
			} else if(event.type === 'mousedrag') { // shifting
				var delta = event.delta;
				var itemNumbers = [];
				paper.project.selectedItems.forEach(function(item){
					itemNumbers.push(item.n);
				});
				app.postAction('translate', {
					ns: itemNumbers,
					delta: {x: delta.x, y: delta.y}
				});
			}
			paper.view.draw();
		};
		selector.onMouseUp = function(event) {
			willShift = false;
		};
		return selector;
	})();

	_tools["pencil"] = (function(){
		var pencil = new paper.Tool();
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
			app.postAction("item", path.exportJSON({asString:false}));
			setTimeout(function(){
				cachepath.remove(); // will be replaced with update from server
				paper.view.draw();
			}, 200);
		};
		return pencil;
	})();

	_tools["brush"] = (function(){
		var brush = new paper.Tool();
		var lastDeltas = [];
		var path;
		brush.onMouseDown = function(event){
			brush.minDistance = _size;
			brush.maxDistance = _size*4;
			path = new paper.Path({
				strokeCap: 'round',
				strokeJoin: 'round',
				fillColor: _color,
				strokeWidth: _size,
			});
			path.add(event.point);
		};
		brush.onMouseDrag = function(event){
			if (path.segments.length > 1) {
				path.removeSegment(path.segments.length-1);
			}
			var delta = event.delta;
			lastDeltas.push(delta);
			if (lastDeltas.length > 17) {
				lastDeltas.shift();
			}
			var averageRadius = lastDeltas.reduce(function (sum, delta) {
				return sum + delta.length;
			}, 0) / lastDeltas.length;
			var toSide = delta.normalize(averageRadius);
			path.add(event.point.add(toSide.rotate(90)));
			path.insert(0, event.point.add(toSide.rotate(-90)));
			path.add(event.point.add(toSide));
			path.closePath();
			path.smooth({type: "catmull-rom"});
		};
		brush.onMouseUp = function(event){
			lastDeltas = [];
			// path.simplify();
			var cachepath = path;
			app.postAction("item", path.exportJSON({asString:false}));
			setTimeout(function(){
				cachepath.remove(); // will be replaced with update from server
				paper.view.draw();
			}, 200);
		};
		return brush;
	})();

	_tools["line"] = (function(){
		var line = new paper.Tool();
		var path;
		var from;
		line.onMouseDown = function(event){
			path = new paper.Path({
				strokeCap: 'round',
				strokeJoin: 'round',
				strokeColor: _color,
				strokeWidth: _size,
			});
			from = event.point;
			path.add(from);
			path.add(from);
		};
		line.onMouseDrag = function(event){
			path.removeSegment(1);
			if (event.modifiers.control) { // only multiples of 15 degree
				path.add(alignToAngle(from, event.point, 15));
			} else {
				path.add(event.point);
			}
		};
		line.onMouseUp = function(event){
			var cachepath = path;
			app.postAction("item", path.exportJSON({asString:false}));
			setTimeout(function(){
				cachepath.remove(); // will be replaced with update from server
				paper.view.draw();
			}, 200);
		};
		return line;
	})();

	_tools["rectangle"] = (function(){
		var rectangle = new paper.Tool();
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
			if (event.modifiers.control) {
				to = alignToAngle(from, to, 90, 45);
			};
			path.addSegments([
				{x: to.x, y: from.y},
				to,
				{x: from.x, y: to.y},
			]);
		}
		rectangle.onMouseUp = function(event){
			app.postAction("item", path.exportJSON({asString:false}));
			setTimeout(function(){
				path.remove(); // will be replaced with update from server
				paper.view.draw();
			}, 200);
		};
		return rectangle;
	})();

	_tools["text"] = (function(){
		var text = new paper.Tool();

		text.onKeyDown = function(event){
			if (event.key === 'backspace') {
				_textItem.content = _textItem.content.substring(0, _textItem.content.length-1);
			} else {
				_textItem.content += event.character;
			}
		};

		text.onMouseMove = function(event){
			_textItem.point = event.point;
		};

		text.onMouseUp = function(event){
			app.postAction("item", _textItem.exportJSON({asString:false}));
			setTimeout(function(){
				_textItem.content = '';
				paper.view.draw();
			}, 100);
		};
		return text;
	})();

	_tools["eyedropper"] = (function(){
		var eyedropper = new paper.Tool();
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
		return eyedropper;
	})();

	_tools["eraser"] = (function(){
		var eraser = new paper.Tool();
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
		return eraser;
	})();

	_tools["move"] = (function(){
		var move = new paper.Tool();
		var pos = {
			deltaX: 0,
			deltaY: 0,
		};
		move.onMouseDown = function (event) {
			pos = {
				deltaX: 0,
				deltaY: 0,
			};
		};
		move.onMouseDrag = function (event){
			pos.deltaX += event.delta.x;
			pos.deltaY += event.delta.y;
			paper.view.scrollBy([-pos.deltaX, -pos.deltaY]);
			paper.view.draw();
		};
		return move;
	})();


	//// end of tools behavior definitions

	app.on("update", function(action){
		if(action.type === "item"){
			var className = action.data[0];
			if (!(className in paper)) {
				console.error("unknown item type", className);
				return;
			}
			var item = new paper[className];
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


	this.zoom = function(direction, clientCenter) {
		var center = paper.view.getEventPoint({
			clientX: clientCenter.x,
			clientY: clientCenter.y,
		});
		if (direction > 0 && paper.view.getZoom() < 4) {
			paper.view.scale(Math.sqrt(2), center);
			paper.view._zoom *= Math.sqrt(2); // bug workaround, should be set by scale
		}
		if (direction < 0 && paper.view.getZoom() > 1/4) {
			paper.view.scale(1/Math.sqrt(2), center);
			paper.view._zoom /= Math.sqrt(2); // bug workaround, should be set by scale
		}
	};

	this.selectTool = function(toolname){
		if(toolname in _tools){
			if(toolname === 'text') {
				_textItem.visible = true;
			} else {
				_textItem.visible = false;
			}
			_tools[toolname].activate();
			_currentToolName = toolname;
			gui.changeCursor(toolname);
			gui.highlightTool(toolname);
			console.log('tool changed to', toolname);
		} else {
			console.error("unknown tool", toolname)
		}
	}

	this.setColor = function(color) {
		_color = color;
		_textItem.fillColor = color;
		gui.setColorOfPicker(color);
	}

	this.setSize = function(size) {
		_size = size;
		_textItem.fontSize = size * 6 + 4;
	}


	this.unselectAll = function() {
		paper.project.deselectAll();
	};

	this.deleteSelected = function() {
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

	this.getUrl = function(){
		var svg = paper.project.exportSVG({asString:true});
		//add xml declaration
		svg = '<?xml version="1.0" standalone="yes"?>\r\n' + svg;
		//convert svg source to URI data scheme.
		var url = "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);
		return url;
	}

});