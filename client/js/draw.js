function CursorManager(project) {
	var _cursorTemplate;
	var _cursorSymbol;
	var _cursors = {};

	var mainLayer = project.activeLayer;
	var cursorsLayer = new paper.Layer();
	mainLayer.activate();

	cursorsLayer.importSVG('/img/cursor.svg', function(cursor) {
		cursor.pivot = [5, 1];
		_cursorTemplate = cursor;
		_cursorSymbol = new paper.SymbolDefinition(cursor, true);
	});

	this.copeZoom = function(scaleFactor) {
		_cursorTemplate.scale(1/scaleFactor);
	};
	this.exists = function(name){
		return !!(name in _cursors);
	};

	this.new = function(name) {
		if (name in _cursors) {
			throw "cursor with this name already exist";
		}
		var randomPoint = paper.Point.random().multiply(paper.view.size).add(paper.view.bounds);
		var cursor = _cursorSymbol.place(randomPoint)
		cursor.pivot = _cursorTemplate.pivot;
		cursor.opacity = 0;
		cursorsLayer.addChild(cursor);
		_cursors[name] = cursor;
	};
	this.moveCursorTo = function (name, position, duration) {
		var steps = Math.floor(duration * (60/1000)) || 1;
		if (!(name in _cursors)) {
			throw "cursor with this name does not exist";
		}
		var cursor = _cursors[name];
		var destination = new paper.Point(position);
		var step = destination.subtract(cursor.position).divide(steps);
		cursor.onFrame = function(event) {
			if (event.count === steps) {
				cursor.onFrame = null;
			} else {
				cursor.translate(step);
			}
		};
		setTimeout(function() {
			if (cursor.data.lastActivity + 1000*15 <= Date.now()) {
				setInactive(name);
			}
		}, 1000*15);
		setActive(name);
		cursor.data.lastActivity = Date.now();
	};

	function setInactive(name) {
		var cursor = _cursors[name];
		if (cursor.opacity === 1) {
			cursor.onFrame = function(event) {
				if (cursor.opacity <= 0) {
					cursor.onFrame = null;
					cursor.opacity = 0;
				} else {
					cursor.opacity -= 0.02;
				}
			};
		}
	};
	function setActive(name) {
		var cursor = _cursors[name];
		cursor.opacity = 1;
	};
}


var draw = new(function Draw(){

	var console = new Logger("draw");

	var _currentToolName = '';

	var _color;
	var _size;

	var _tools = {};

	var _objects = [];

	var _textItem;

	var cursorManager;

	/* init */
	$(function(){
		paper.setup("canvas");
		paper.view.scrollBy([-paper.view.center.x, -paper.view.center.y]); // center first
		paper.view.onResize = function(event){
			paper.view.scrollBy([-event.delta.width/2, - event.delta.height/2]);
		};

		var background = new paper.Shape.Rectangle({
			rectangle: paper.view.bounds,
			fillColor: {hue: 0, saturation: 0, lightness: 0.96},
		});
		background.onFrame = function() {
			this.bounds = paper.view.bounds;
		};

		_textItem = new paper.PointText({
			// fontFamily: 'Consolas',
			fontSize: 20,
			content: " ",
			visible: false,
		});
		_textItem.onFrame = function(event) {
			if (event.count % 25 === 0) {
				this.content = this.content.replace(/(_| )$/, function(match) {
					return match === "_" ? " ": "_";
				});
			}
		};

		draw.setColor('#333');
		draw.setSize(2);

		cursorManager = new CursorManager(paper.project);

		app.on("logged on", function() {
			paper.project.view.on('mousemove', function(event) {
				app.postCursorPosition(event.point);
			});
		});

		app.on("userlist update", function(users) {
			users.forEach(function(user) {
				if (app.getNick() !== user.nick && !cursorManager.exists(user.nick)) {
					cursorManager.new(user.nick);
				}
			});
		});

		app.on("cursors update", function(cursors) {
			cursors.forEach(function(cursor){
				if (app.getNick() !== cursor.name) {
					cursorManager.moveCursorTo(cursor.name, paper.Point.importJSON(cursor.position), 125);
				}
			});
		});

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
			if (item instanceof paper.Path) {
				if (item.isClosed() && item.hasFill()) {
					if (item.contains(point)) {
						return true;
					}
				}
				var nearestPoint = item.getNearestPoint(point);
				if (nearestPoint) {
					return nearestPoint.isClose(point, radius);
				}
			}
			if (item instanceof paper.PointText) {
				return item.bounds.contains(point);
			}
			return false;
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
				}) && !event.modifiers.control){
					willShift = true;
				}
			}
			if(!willShift){ // selecting
				if(!event.modifiers.control && event.type === 'mousedown'){
					paper.project.deselectAll();
				}
				getItemsNearPoint(event.point).forEach(function(item){
					if (event.type === 'mousedown') {
						item.selected = !item.selected;
					}
					if (event.type === 'mousedrag') {
						item.selected = true;
					}
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
			var cachedPath = path;
			app.postAction("item", path.exportJSON({asString:false}));
			setTimeout(function(){
				cachedPath.remove(); // will be replaced with update from server
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
			var cachedPath = path;
			app.postAction("item", path.exportJSON({asString:false}));
			setTimeout(function(){
				cachedPath.remove(); // will be replaced with update from server
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
			if (event.modifiers.shift) { // only multiples of 15 degree
				path.add(alignToAngle(from, event.point, 15));
			} else {
				path.add(event.point);
			}
		};
		line.onMouseUp = function(event){
			var cachedPath = path;
			app.postAction("item", path.exportJSON({asString:false}));
			setTimeout(function(){
				cachedPath.remove(); // will be replaced with update from server
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
			if (event.modifiers.shift) {
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
			var cachedPath = path;
			setTimeout(function(){
				cachedPath.remove(); // will be replaced with update from server
				paper.view.draw();
			}, 200);
		};
		return rectangle;
	})();

	_tools["oval"] = (function(){
		var oval = new paper.Tool();
		var path;
		var from;
		oval.onMouseDown = function(event){
			from = event.point;
			path = new paper.Path.Ellipse({
				point: from,
				size: from.subtract(from),
				strokeCap: 'round',
				strokeJoin: 'round',
				strokeColor: _color,
				strokeWidth: _size,
			});
		};
		oval.onMouseDrag = function(event){
			var to = event.point;
			path.remove();
			if (event.modifiers.shift) {
				to = alignToAngle(from, to, 90, 45);
			};
			path = new paper.Path.Ellipse({
				point: from,
				size: to.subtract(from),
				strokeCap: 'round',
				strokeJoin: 'round',
				strokeColor: _color,
				strokeWidth: _size,
			});
		}
		oval.onMouseUp = function(event){
			app.postAction("item", path.exportJSON({asString:false}));
			var cachedPath = path;
			setTimeout(function(){
				cachedPath.remove(); // will be replaced with update from server
				paper.view.draw();
			}, 200);
		};
		return oval;
	})();

	_tools["text"] = (function(){
		var text = new paper.Tool();

		text.onKeyDown = function(event){
			_textItem.content = _textItem.content.slice(0, -1);
			if (event.key === 'backspace') {
				event.preventDefault();
				_textItem.content = _textItem.content.slice(0, -1);
			} else {
				_textItem.content += event.character;
			}
			_textItem.content += " ";
		};

		text.onMouseMove = function(event){
			_textItem.point = event.point.add([10, -10]);
		};

		text.onMouseUp = function(event){
			if (_textItem.content.length === 1) {
				return;
			}
			_textItem.content = _textItem.content.slice(0, -1);
			app.postAction("item", _textItem.exportJSON({asString:false}));
			setTimeout(function(){
				_textItem.content = " ";
				paper.view.draw();
			}, 100);
		};
		return text;
	})();

	_tools["eyedropper"] = (function(){
		var eyedropper = new paper.Tool();
		var path;

		eyedropper.onMouseDown = function(event){
			getItemsNearPoint(event.point).some(function(item){
				var color = item.strokeColor || item.fillColor;
				draw.setColor(color.toCSS());
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
		var delta = {
			x: 0,
			y: 0,
		};
		move.onMouseDown = function (event) {
			delta = {
				x: 0,
				y: 0,
			};
		};
		move.onMouseDrag = function (event){
			delta.x += event.delta.x;
			delta.y += event.delta.y;
			paper.view.scrollBy([-delta.x, -delta.y]);
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


	/*
	 * Public API
	 */


	this.zoom = function(direction, clientCenter) {
		var center = clientCenter ? paper.view.getEventPoint({
			clientX: clientCenter.x,
			clientY: clientCenter.y,
		}) : paper.view.center;
		var multiple = 1;
		var zoom = paper.view.getZoom();
		if (direction > 0 && zoom < 4 && !almostEquals(zoom, 4)) {
			multiple = Math.SQRT2;
		}
		if (direction < 0 && zoom > 1/4 && !almostEquals(zoom, 1/4)) {
			multiple = Math.SQRT1_2;
		}
		var step = Math.sqrt(Math.sqrt(multiple));
		var steps = 0;
		if (!paper.view.onFrame) {
			paper.view.onFrame = function(event) {
				if (steps === 4) {
					paper.view.onFrame = null;
				} else {
					var zoom = paper.view.getZoom();
					if (
						(step > 1 && zoom < 4 && !almostEquals(zoom, 4)) ||
						(step < 1 && zoom > 1/4 && !almostEquals(zoom, 1/4))
					) {
						paper.view.scale(step, center);
						gui.setZoomInfo(paper.view.getZoom());
					} else {
						paper.view.onFrame = null;
					}
					steps++;
				}
			};
		} else {
			paper.view.scale(multiple, center);
			gui.setZoomInfo(paper.view.getZoom());
		}
		cursorManager.copeZoom(multiple);
		gui.setZoomInfo(paper.view.getZoom());


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
	};

	this.setColor = function(color) {
		_color = color;
		_textItem.fillColor = color;
		gui.setColorOfPicker(color);
	};

	this.setSize = function(size) {
		_size = size;
		_textItem.fontSize = size * 6 + 4;
	};


	this.unselectAll = function() {
		paper.project.deselectAll();
	};

	this.deleteSelected = function() {
		paper.project.selectedItems.forEach(function(item){
			erase(item);
		});
		paper.view.draw();
	};

	this.moveSelected = function(dirrection) {
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
	
	this.getBlob = function(fileType, callback) {
		if (typeof callback === "function") {
			if (fileType === "png") {
				var selected = paper.project.selectedItems;
				paper.project.deselectAll(); 
				paper.view.draw();
				paper.view.element.toBlob(function(blob){
					callback(blob);
					selected.forEach(function (item) {
						item.selected = true;
					});
				});
			}
			if (fileType === "svg") {
				var svgString = paper.project.exportSVG({asString:true});
				var blob = new Blob(
					[svgString],
					{type: "image/svg+xml"}
				);
				callback(blob);
			}
		}
	}

});

function almostEquals (a, b, e) {
	e = e || 1E-6;
	return Math.abs(a-b) < e;
}