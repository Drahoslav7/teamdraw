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
				app.postCursorPosition(toPlainObject(event.point));
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
					cursorManager.moveCursorTo(cursor.name, cursor.position, 125);
				}
			});
		});
	});

	function erase(item) {
		if (item.visible) { // prevent from multiple delete action on one item
			item.visible = false;
			app.postAction("erase", item.n, function(err) {
				if (err) {
					item.visible = true;
				}
			});
		}
	}

	function cloneSelected() {
		paper.project.selectedItems.forEach(function (item) {
			var clone = item.clone();
			clone.selected = false;
			app.postAction("item", clone.exportJSON({asString:false}), function () {
				clone.remove(); // will be replaced with update from server
			});
		});
	}

	function filterByN(wantedN) {
		return {
			n: function(providedN){
				if(typeof wantedN === "number"){
					return providedN === wantedN;
				}
				if(wantedN instanceof Array){
					return wantedN.some(function(wantedN){
						return providedN === wantedN;
					});
				}
			}
		}
	}

	var withN = {
		n: function(n){
			return n !== undefined;
		},
	};

	function getItemsNearPoint (point) {
		var radius = 4 / paper.view.getZoom();
		return paper.project.getItems(withN).filter(function(item) {
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

	function getItemsNearEvent (event) {
		var trackingPath = new paper.Path({
			segments: [event.lastPoint, event.point],
			visible: false,
		});
		setTimeout(function() {
			trackingPath.remove();
		});

		return _.uniq(paper.project.getItems(withN).filter(function(item) {
			return trackingPath.intersects(item);
		}).concat(getItemsNearPoint(event.point)));
	};

	/**
	 * convert paper object to plain object, so it could be JSONized in more common way
	 * eg.: {"x": 5, "y": 6} isntead of ["Point", 5, 6]
	 */
	function toPlainObject (paperObj) {
		if(paperObj.className === "Point") {
			return {x: paperObj.x, y: paperObj.y};
		}
		return paperObj;
	}

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


	_tools["none"] = new paper.Tool();

	/**
	 * tools behavior definitions
	 */

	_tools["selector"] = (function(){
		var selector = new paper.Tool();
		var path;
		var willTranslate = false;
		var translationDelta = new paper.Point();

		selector.onMouseDown = function(event) {
			translationDelta = new paper.Point();

			if (getItemsNearPoint(event.point).some(function(item) { // clicked at selected item
				return item.selected === true;
			}) && !event.modifiers.control) {
				willTranslate = true;
			}

			if (!willTranslate) { // selecting
				if (!event.modifiers.control) {
					paper.project.deselectAll();
				}
				getItemsNearPoint(event.point).forEach(function(item) {
					item.selected = !item.selected;
				});
			} else if (event.modifiers.alt) {
				cloneSelected();
			}

		}

		selector.onMouseDrag = function(event) {
			if (!willTranslate) { // selecting
				getItemsNearEvent(event).forEach(function(item) {
					item.selected = true;
				});
			} else { // shifting
				translationDelta = translationDelta.add(event.delta);
				paper.project.selectedItems.forEach(function(item) {
					item.translate(event.delta);
				});
			}
		};

		selector.onMouseUp = function(event) {
			willTranslate = false;
			if (!translationDelta.isZero()) {
				var translatinItems = paper.project.selectedItems
				var itemNumbers = translatinItems.map(function(item) {
					item.visible = false;
					return item.n;
				});

				app.postAction('translate', {
					ns: itemNumbers,
					delta: toPlainObject(translationDelta),
				}, function(err) {
					translatinItems.forEach(function(item) {
						item.translate(translationDelta.multiply(-1));
						item.visible = true;
					});
				});
			}
		}

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
			if (!path) {
				return;
			}
			path.add(event.point);
		};
		pencil.onMouseUp = function(event){
			if (!path) {
				return;
			}
			if(path.segments.length === 1) { // is dot
				var point = path.segments[0].point;
				var circle = new paper.Path.Circle(point, path.strokeWidth/4);
				circle.strokeColor = path.strokeColor;
				circle.strokeWidth = path.strokeWidth/2;
				path.remove();
				path = circle;
			} else {
				path.simplify(1.2/Math.pow(paper.view.zoom, 1.5));
			}
			var cachedPath = path;
			app.postAction("item", path.exportJSON({asString:false}), function() {
				cachedPath.remove(); // will be replaced with update from server
			});
		};
		pencil.abort = function() {
			if (path) {
				path.remove();
			}
			path = undefined;
		};
		return pencil;
	})();

	_tools["brush"] = (function(){
		var brush = new paper.Tool();
		var lastDeltas = [];
		var startPoint;
		var path;
		brush.onMouseDown = function(event){
			lastDeltas = [];
			brush.minDistance = _size;
			brush.maxDistance = _size*4;
			path = new paper.Path({
				strokeCap: 'round',
				strokeJoin: 'round',
				fillColor: _color,
				strokeWidth: _size,
			});
			startPoint = event.point
			var toSide = paper.Point.random().normalize(_size);
			path.add(startPoint.subtract(toSide));
			path.add(startPoint.add(toSide.rotate(+90)));
			path.add(startPoint.add(toSide));
			path.add(startPoint.add(toSide.rotate(-90)));
			path.closePath();
			path.smooth({type: "catmull-rom"});
		};
		brush.onMouseDrag = function(event){
			if (event.count === 0) {
				path.removeSegments(0);
				path.add(startPoint);
			} else {
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
			if (!path) {
				return;
			}
			if (path.segments.length > 4) {
				path.simplify(1.5/Math.pow(paper.view.zoom, 0.8));
			}
			var cachedPath = path;
			app.postAction("item", path.exportJSON({asString:false}), function () {
				cachedPath.remove(); // will be replaced with update from server

			});
		};
		brush.abort = function() {
			lastDeltas = [];
			if (path) {
				path.remove();
			}
			path = undefined;
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
			if (!path) {
				return;
			}
			var cachedPath = path;
			app.postAction("item", path.exportJSON({asString:false}), function() {
				cachedPath.remove(); // will be replaced with update from server

			});
		};
		line.abort = function() {
			if (path) {
				path.remove();
			}
			path = undefined;
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
			if (!path) {
				return;
			}
			var cachedPath = path;
			app.postAction("item", path.exportJSON({asString:false}), function() {
				cachedPath.remove(); // will be replaced with update from server

			});
		};
		rectangle.abort = function() {
			if (path) {
				path.remove();
			}
			path = undefined;
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
			if (!path) {
				return;
			}
			var cachedPath = path;
			app.postAction("item", path.exportJSON({asString:false}), function() {
				cachedPath.remove(); // will be replaced with update from server

			});
		};
		oval.abort = function() {
			if (path) {
				path.remove();
			}
			path = undefined;
		};
		return oval;
	})();

	_tools["heart"] = (function(){
		var heart = new paper.Tool();
		var path;
		var from;

		heart.onMouseDown = function(event) {
			from = event.point;
			path = new paper.Path({
				strokeCap: 'round',
				strokeJoin: 'round',
				strokeColor: _color,
				strokeWidth: _size,
			});
		};
		heart.onMouseDrag = function(event){
			var to = event.point;
			if (event.modifiers.shift) {
				to = alignToAngle(from, to, 90, 45);
			};
			var w = to.subtract(from).x;
			var h = to.subtract(from).y;

			path.split(0, 0);
			path.removeSegments(0); // all
			path.add([0, 0]);

			var mirror = path.clone();

			var bottom = new paper.Point([0, -h/4]);
			var top = new paper.Point([0, -h*3/4]);

			path.cubicCurveTo(bottom, [-w/2, -(h/2)], [-w/2, -h*3/4]);
			mirror.cubicCurveTo(bottom, [+w/2, -(h/2)], [+w/2, -h*3/4]);
			path.cubicCurveTo([-w/2, -h*1.1], [0, -h*1.1], top);
			mirror.cubicCurveTo([+w/2, -h*1.1], [0, -h*1.1], top);

			path.join(mirror);
			path.join();

			path.translate(from.add(to.subtract(from).divide(2)));
			path.translate([0, h/2]);
		}
		heart.onMouseUp = function(event){
			if (!path) {
				return;
			}
			var cachedPath = path;
			app.postAction("item", path.exportJSON({asString:false}), function() {
				cachedPath.remove(); // will be replaced with update from server
			});
		};
		heart.abort = function() {
			if (path) {
				path.remove();
			}
			path = undefined;
		};
		return heart;
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
			if (event.event.which !== Button.LEFT) {
				return;
			}
			if (_textItem.content.length === 1) {
				return;
			}
			_textItem.content = _textItem.content.slice(0, -1);
			app.postAction("item", _textItem.exportJSON({asString:false}), function(err) {
				if (err) {
					_textItem.content += " ";
				} else {
					_textItem.content = " ";
				}
			});
		};
		text.abort = function() {
		};
		return text;
	})();

	_tools["eyedropper"] = (function(){
		var eyedropper = new paper.Tool();

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
		};
		return eyedropper;
	})();

	_tools['bucket'] = (function() {
		var bucket = new paper.Tool();

		bucket.onMouseDown = function(event){
			getItemsNearPoint(event.point).some(function(item){
				if (item.hasFill()) {
					item.fillColor = _color;
				} else {
					item.strokeColor = _color;
				}
				return true;
			});
		};

		bucket.onMouseMove = function(event){ // hover
			paper.project.deselectAll();
			getItemsNearPoint(event.point).some(function(item){
				return item.selected = true;
			});
		};

		return bucket;
	})();

	_tools["eraser"] = (function(){
		var eraser = new paper.Tool();
		var path;

		eraser.onMouseDown = function(event) {
			getItemsNearPoint(event.point).forEach(function(item) {
				erase(item);
			});

		};
		eraser.onMouseDrag = function(event) {
			getItemsNearEvent(event).forEach(function(item) {
				erase(item);
			});

		};
		eraser.onMouseMove = function(event){ // hover

			paper.project.deselectAll();
			getItemsNearEvent(event).forEach(function(item) {
				item.selected = true;
			});

		}
		return eraser;
	})();

	_tools["move"] = (function(){
		var move = new paper.Tool();
		var dontDrag = false;
		var delta = {
			x: 0,
			y: 0,
		};
		move.onMouseDown = function (event) {
			if (!event) {
				dontDrag = true;
			}
			delta = {
				x: 0,
				y: 0,
			};
		};
		move.onMouseDrag = function (event){
			if (dontDrag) {
				dontDrag = false;
				return;
			}
			delta.x += event.delta.x;
			delta.y += event.delta.y;
			paper.view.scrollBy([-delta.x, -delta.y]);

		};
		return move;
	})();



	//// end of tools behavior definitions

	app.on("update", function(action) {
		if (action.type === "item") {
			var json = action.data;
			var n = action.n;
			var className = json[0];
			if (!(className in paper)) {
				console.error("unknown item type", className);
				return;
			}
			var item = new paper[className];
			item.importJSON(json);
			item.n = n; // for deleting and manipulation purposes
		}
		if (action.type === "erase") {
			var n = action.data;
			var item = paper.project.getItem(filterByN(n));
			if (!item) {
				console.error("nothing with n=%d to erase", n);
				return;
			}
			item.remove();
		}
		if (action.type === "translate") {
			var ns = action.data.ns;
			var delta = action.data.delta;
			paper.project.getItems(filterByN(ns)).forEach(function(item) {
				item.translate(delta);
			});
		}
	});

	// init end


	/*
	 * Public API
	 */


	this.zoom = (function initZoom() {
		const ZOOM_STEP_IN = Math.sqrt(Math.sqrt(Math.SQRT2));
		const ZOOM_STEP_OUT = Math.sqrt(Math.sqrt(Math.SQRT1_2));
		const FRAMES = 4;
		const MIN_ZOOM = 1/4;
		const MAX_ZOOM = 4;
		var zoomCenter;
		var zoomDirection = 0;

		function zoom(direction, clientCenter) {
			zoomCenter = clientCenter ? paper.view.getEventPoint({
				clientX: clientCenter.x,
				clientY: clientCenter.y,
			}) : paper.view.center;
			zoomDirection += direction*FRAMES;
		};

		$(function(){
			paper.view.onFrame = function(event) {
				if (zoomDirection !== 0) {
					var zoom = paper.view.getZoom();
					if (
						(zoomDirection > 0 && zoom < MAX_ZOOM && !almostEquals(zoom, MAX_ZOOM)) ||
						(zoomDirection < 0 && zoom > MIN_ZOOM && !almostEquals(zoom, MIN_ZOOM))
					) {
						if (zoomDirection < 0) {
							++zoomDirection;
							paper.view.scale(ZOOM_STEP_OUT, zoomCenter);
							cursorManager.copeZoom(ZOOM_STEP_OUT);
						}
						if (zoomDirection > 0) {
							--zoomDirection;
							paper.view.scale(ZOOM_STEP_IN, zoomCenter);
							cursorManager.copeZoom(ZOOM_STEP_IN);
						}

						gui.setZoomInfo(paper.view.getZoom());
					} else {
						zoomDirection = 0;
					}
				}
			};
		});

		return zoom;
	})();

	this.changeToolTo = function(toolname){
		if(toolname in _tools){
			if(toolname === 'text') {
				_textItem.visible = true;
			} else {
				_textItem.visible = false;
			}
			_tools[toolname].activate();
			switch(_currentToolName){
				case "pencil":
				case "brush":
				case "line":
				case "rectangle":
				case "oval":
				case "text":
					_tools[_currentToolName].abort();
			}
			switch(toolname) {
				case "move":
					_tools[toolname].onMouseDown();
			}
			gui.changeCursor(toolname);
			gui.highlightTool(toolname);
			_currentToolName = toolname;
			console.log('tool changed to', toolname);
		} else {
			console.error("unknown tool", toolname);
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