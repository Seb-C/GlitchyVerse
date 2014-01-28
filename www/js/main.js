/**
 * One file to rule them all, One file to find them,
 * One file to run them all and in the darkness bind them.
 */

glMatrix.setMatrixArrayType(Array);

Configuration.load();

// TODO bug showing images from css ?!?

var canvas = document.getElementById("canvas");
var gl = canvas.getContext("webgl",              {preserveDrawingBuffer: true}) 
	  || canvas.getContext("experimental-webgl", {preserveDrawingBuffer: true});

if(gl) {
	gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Set clear color to black, fully opaque
	gl.clearDepth(1.0);                 // Clear everything
	gl.enable(gl.DEPTH_TEST);           // Enable depth testing
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	gl.enable(gl.BLEND);                // Alpha channel for textures
	gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
	//gl.enable(gl.VERTEX_PROGRAM_POINT_SIZE);
	
	Configuration.init();
	Controls.init(canvas);
	Materials.init(gl);
	
	var world = new World();
	world.init(gl);
	
	// TODO remove last invisible webgl errors + fix min-capability-mode
	var server = new ServerConnection(window.location.host, "play", world);
	
	// TODO remove blur effect on far textures ?
	
	// Full screen canvas
	var resize = function() {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		world.resize(canvas.width, canvas.height);
	};
	window.addEventListener('resize', resize);
	resize();
	
	// Avoid scrolling
	window.addEventListener('scroll', function(event) {
		event.preventDefault();
		window.scrollTo(0, 0);
	});
	
	// Fullscreen button (and it have to resize canvas to be sure to have a good resolution
	document.getElementById("fullscreenButton").addEventListener("click", function() {
		if(document.documentElement.webkitRequestFullscreen) {
			// Webkit developers, I hate you ...
			document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
		} else {
			document.documentElement.requestFullscreen();
		}
		
		// Not sure if it should be automatically thrown, but it's better to be sure :)
		resize();
	});
	
	var updateAll = function() {
		world.update();
		TimerManager.update();
		
		// If the user tries to click on something in the world
		var picking = Controls.getPicking();
		if(picking) {
			world.draw(world.DRAW_MODE_PICK_MESH);
			
			// Translating mouse coordinates (0, 0 point is on the top left corner)
			// to WebGL coordinates (0, 0 point is in the bottom left corner)
			var x = picking[0];
			var y = world.camera.screenSize[1] - picking[1];
			var pixel = new Uint8Array(4);
			gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
			
			// Getting picked mesh and executing callback
			var pickedMesh = world.getPickableMeshByColor([pixel[0], pixel[1], pixel[2]]);
			
			if(pickedMesh) {
				var xClick = null, yClick = null;
				if(pickedMesh.isScreen) {
					world.draw(world.DRAW_MODE_PICK_SCREEN);
					
					// Translating mouse coordinates (0, 0 point is on the top left corner)
					// to WebGL coordinates (0, 0 point is in the bottom left corner)
					var x = picking[0];
					var y = world.camera.screenSize[1] - picking[1];
					var pixel = new Uint8Array(4);
					gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
					xClick = pixel[0] / 255;
					yClick = pixel[1] / 255;
				}
				
				pickedMesh.pickCallBack(xClick, yClick);
			}
		}
	};
	
	// TODO login screen : enter key to validate
	var mainLoop = function() {
		updateAll();
		
		world.draw();
		
		// Next frame will be synchronized with browser
		window.requestAnimationFrame(mainLoop, canvas);
	}; mainLoop();
} else {
	alert("Unable to initialize WebGL. Your browser may not support it.");
}
