
var draw = new(function Draw(){

	var _canvas;
	var _ctx;

	var _color = 'black';
	var _size = 2;

	var _tools = {};

	var _objects = [];

	// init
	$(function(){

		_canvas = $("#canvas");
		paper.setup(_canvas[0]);

		paper.view.onResize = function(event){
			console.log(event);
			paper.view.scrollBy([-event.delta.width/2, - event.delta.height/2]);
		}

		/** tools behavior **/
		var path;

		function getSelectOption(event) {
			return {
				segments: function(segments){
					if(!segments){
						return false;
					}
					return segments.some(function(segment){
						var r = 5; // radius
						var v = segment.point;
						var p = event.point;
						return (p.x-r <= v.x  && v.x <= p.x+r && p.y-r <= v.y && v.y <= p.y+r);
					});
				},
			};
		}


		// pointer
		var pointer = new paper.Tool();
		_tools.pointer = pointer;
		pointer.onMouseDown = function select(event){
			if(paper.Key.isDown('shift')){
				return;
			}

			if(!paper.Key.isDown('control')){
				// unselect
				paper.project.selectedItems.forEach(function(item){
					item.selected = false;
				});
			}

			paper.project.getItems(getSelectOption(event)).forEach(function(item){
				item.selected = true;
			});
			paper.view.draw();
		}
		pointer.onMouseDrag = function(event){
			if(paper.Key.isDown('shift')){
				paper.view.scrollBy([-event.delta.x, -event.delta.y]);
			}
			paper.view.draw();
		};


		// pencil
		var pencil = new paper.Tool();
		_tools.pencil = pencil;
		pencil.minDistance = 5;
		pencil.maxDistance = 5;
		pencil.onMouseDown = function(event){
			path = new paper.Path();
			path.strokeCap = 'round';
			_objects.push(path);
			path.strokeColor = _color;
			path.strokeWidth = _size;
			path.add(event.point);
		}
		pencil.onMouseDrag = function(event){
			path.add(event.point);
		};


		// eraser
		var eraser = new paper.Tool();
		_tools.eraser = eraser;
		eraser.onMouseDown = eraser.onMouseDrag = function(event){
			paper.project.getItems(getSelectOption(event)).forEach(function(item){
				item.remove();
			});
			paper.view.draw();
		};

		eraser.onMouseMove = function(event){
			paper.project.selectedItems.forEach(function(item){
				item.selected = false;
			});
			paper.project.getItems(getSelectOption(event)).forEach(function(item){
				item.selected = true;
			});
			paper.view.draw();
		}




		draw.selectTool("pencil");
	}); // init end



	this.selectTool = function(toolname){
		if(toolname in _tools){
			_tools[toolname].activate();
		} else {
			console.error("unknown tool", toolname)
		}
	}

	this.setColor = function(color){
		_color = color;
	}

	this.setSize = function(size){
		_size = size;
	}

	this.delete = function(){
		paper.project.selectedItems.forEach(function(item){
			item.remove();
		});
		paper.view.draw();
	};



	var _undoned = [];
	this.undo = function(){
		var item = _objects.pop();
		if(item){
			item.visible = false;
			paper.view.draw();
			_undoned.push(item);
		}
	}

	this.redo = function(){
		var item = _undoned.pop();
		if(item){
			_objects.push(item)
			item.visible = true;
			paper.view.draw();
		}
	};

});