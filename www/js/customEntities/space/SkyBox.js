/**
 * Creates a skybox
 * @param World The world where to put the skybox
 */
CustomEntities.SkyBox = function(world) {
	var meshesHalfSize = Math.cos(Math.PI / 4) * world.camera.viewDistance / 2;
	
	var starDensity = [0.001, 0.005]; // Range
	var resolution = 1024;
	var starMinSize  = 2;
	var starMaxSize  = 5;
	var starMinColorComponentValue = 200;
	var starTempCanvasSize = 50;
	
	var meshes = [];
	var model = new Model(world, meshes);
	
	// TODO make it deterministic, depending on position in space and universe seed ?
	
	FILES.getImage("www/objects/textures/star.png", function() {
		// Main canvas where each texture is drawn
		var canvas = document.createElement("canvas");
		canvas.width = canvas.height = resolution;
		var context = canvas.getContext("2d");
		
		// Temp canvas to store a reduced sun texture
		var sunCanvas = document.createElement("canvas");
		sunCanvas.width = sunCanvas.height = starTempCanvasSize;
		var sunContext = sunCanvas.getContext("2d");
		sunContext.drawImage(this, 0, 0, starTempCanvasSize, starTempCanvasSize);
		
		// Temp canvas to colorize the star before drawing it in main canvas
		var tempCanvas = document.createElement("canvas");
		tempCanvas.width = tempCanvas.height = starTempCanvasSize;
		var tempContext = tempCanvas.getContext("2d");
		
		var density = starDensity[0] + Math.random() * (starDensity[1] - starDensity[0]);
		
		// Generating each face of the skybox
		var meshesTextures = [];
		for(var i = 0 ; i < 6 ; i++) {
			// Setting background
			context.fillStyle = "black";
			context.fillRect(0, 0, resolution, resolution);
			
			var starCount = Math.round(resolution * resolution * density);
			
			for(var j = 0 ; j < starCount ; j++) {
				var size = Math.round(starMinSize + (starMaxSize - starMinSize) * Math.pow((Math.exp(Math.random()) - 1) / (Math.E - 1), 3));
				
				var x = Math.round(Math.random() * resolution);
				var y = Math.round(Math.random() * resolution);
				
				// A star cannot be cut on the border of the texture
				if(x + size > resolution) x = resolution - size;
				if(y + size > resolution) y = resolution - size;
				
				// Setting star color
				var colorRatio = size / starMaxSize;
				var r = Math.round(starMinColorComponentValue + (255 - starMinColorComponentValue) * Math.random() * colorRatio);
				var g = Math.round(starMinColorComponentValue + (255 - starMinColorComponentValue) * Math.random() * colorRatio);
				var b = Math.round(starMinColorComponentValue + (255 - starMinColorComponentValue) * Math.random() * colorRatio);
				tempContext.fillStyle = "rgb(" + r + ", " + g + ", " + b + ")";
				
				// Drawing star on temp canvas with the right colour
				tempContext.drawImage(sunCanvas, 0, 0, starTempCanvasSize, starTempCanvasSize);
				tempContext.globalCompositeOperation = "source-in";
				tempContext.globalAlpha = 0.9;
				tempContext.fillRect(0, 0, starTempCanvasSize, starTempCanvasSize);
				tempContext.globalAlpha = 1; // Default value
				tempContext.globalCompositeOperation = "source-over"; // Default value
				
				// Copying star on texture
				context.drawImage(tempCanvas, x, y, size, size);
			}
			
			meshesTextures.push(Materials.setCanvasAsTexture(world.gl, canvas, null));
		}
		
		var normals = [0, 0, 0];
		var texturePart = [
			0, 0,
			1, 0,
			1, 1,
			0, 1
		];
		
		// Creating meshes
		meshes.push(new Mesh(
			meshesTextures[0],
			[
				-meshesHalfSize,  meshesHalfSize, meshesHalfSize,
				 meshesHalfSize,  meshesHalfSize, meshesHalfSize,
				 meshesHalfSize, -meshesHalfSize, meshesHalfSize,
				-meshesHalfSize, -meshesHalfSize, meshesHalfSize
			],
			normals,
			texturePart
		)); // Front
		meshes.push(new Mesh(
			meshesTextures[1],
			[
				 meshesHalfSize,  meshesHalfSize, -meshesHalfSize,
				-meshesHalfSize,  meshesHalfSize, -meshesHalfSize,
				-meshesHalfSize, -meshesHalfSize, -meshesHalfSize,
				 meshesHalfSize, -meshesHalfSize, -meshesHalfSize
			],
			normals,
			texturePart
		)); // Back
		meshes.push(new Mesh(
			meshesTextures[2],
			[
				-meshesHalfSize,  meshesHalfSize,  meshesHalfSize,
				-meshesHalfSize,  meshesHalfSize, -meshesHalfSize,
				-meshesHalfSize, -meshesHalfSize, -meshesHalfSize,
				-meshesHalfSize, -meshesHalfSize,  meshesHalfSize
			],
			normals,
			texturePart
		)); // Left
		meshes.push(new Mesh(
			meshesTextures[3],
			[
				meshesHalfSize,  meshesHalfSize, -meshesHalfSize,
				meshesHalfSize,  meshesHalfSize,  meshesHalfSize,
				meshesHalfSize, -meshesHalfSize,  meshesHalfSize,
				meshesHalfSize, -meshesHalfSize, -meshesHalfSize
			],
			normals,
			texturePart
		)); // Right
		meshes.push(new Mesh(
			meshesTextures[4],
			[
				-meshesHalfSize, meshesHalfSize,  meshesHalfSize,
				 meshesHalfSize, meshesHalfSize,  meshesHalfSize,
				 meshesHalfSize, meshesHalfSize, -meshesHalfSize,
				-meshesHalfSize, meshesHalfSize, -meshesHalfSize
			],
			normals,
			texturePart
		)); // Top
		meshes.push(new Mesh(
			meshesTextures[5],
			[
				-meshesHalfSize, -meshesHalfSize, -meshesHalfSize,
				 meshesHalfSize, -meshesHalfSize, -meshesHalfSize,
				 meshesHalfSize, -meshesHalfSize,  meshesHalfSize,
				-meshesHalfSize, -meshesHalfSize,  meshesHalfSize
			],
			normals,
			texturePart
		)); // Bottom
		
		model.regenerateCache();
	});
	
	this.parent(world, model, vec3.create(), quat.create());
	
	this.getRelativePosition = function() {
		return world.positionAbsoluteToRelative(world.camera.getAbsolutePosition());
	};
};
CustomEntities.SkyBox.extend(Entity);
