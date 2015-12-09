
var draw = new(function Draw(){

	var _canvas;
	var _ctx;

	var _color = 'black';

	var _tools = [];

	// init
	$(function(){
		_canvas = $("#canvas");
		resizeCanvas();
		paper.setup(_canvas[0]);

		// tools behavior
		var path;
		var pencil = new paper.Tool();
		_tools.pencil = pencil;
		pencil.minDistance = 5;
		pencil.onMouseDown = function(event){
			path = new paper.Path();
			path.strokeColor = _color;
			path.add(event.point);
		}

		pencil.onMouseDrag = function(event){
			path.add(event.point);
		};

	});

	this.selectTool = function(toolname){
		switch(toolname){
			case "pencil":
				_tools.pencil.activate();
		}
	}

	this.setColor = function(color){
		_color = color;
	}





	function resizeCanvas (){
		_canvas.height($("#workarea").height()); 
		_canvas.width($("#workarea").width()); 
	}



});