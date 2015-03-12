/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Sébastien CAPARROS (GlitchyVerse)
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

// TODO remove old control screen

Building.builders.Hologram = (function() {
	var path = "www/objects/textures/hologramScreen/";
	
	var imgSlider  = FILES.getImage(path + "slider.png");
	var imgTexture = FILES.getImage(path + "texture.png");
	var imgGroup = [
		FILES.getImage(path + "group_1.png"),
		FILES.getImage(path + "group_2.png"),
		FILES.getImage(path + "group_3.png"),
		FILES.getImage(path + "group_4.png"),
		FILES.getImage(path + "group_5.png")
	];
	var imgSelect = [
		FILES.getImage(path + "select_this.png"),
		FILES.getImage(path + "select_1.png"),
		FILES.getImage(path + "select_2.png"),
		FILES.getImage(path + "select_3.png"),
		FILES.getImage(path + "select_4.png"),
		FILES.getImage(path + "select_5.png")
	];
	
	// ImageData of the areas image
	var areas = (function() {
		var imgAreas = FILES.getImage(path + "areas.png");
		
		var canvas = document.createElement("canvas");
		canvas.width = imgAreas.width;
		canvas.height = imgAreas.height;
		
		var context = canvas.getContext("2d");
		context.drawImage(imgAreas, 0, 0);
		
		return context.getImageData(0, 0, canvas.width, canvas.height);
	})();
	
	var zoomFactor = 1.2;
	
	var temp = vec3.create();
	
	return function(building, state) {
		building.model.loadMeshesFromObj("hologram.obj");
		
		// The screens are not enabled if the building is not enabled and built
		if(building.isBuilt && building.isEnabled) {
			// Determining the projection surface
			var projectionSurfaceMeshes = building.model.meshGroups["projection_surface"];
			var projectionSurfaceMin = vec3.create();
			var projectionSurfaceMax = vec3.create();
			if(projectionSurfaceMeshes) {
				for(var i = 0 ; i < projectionSurfaceMeshes.length ; i++) {
					var surf = projectionSurfaceMeshes[i];
					var vertices = surf.vertices;
					
					vec3.set(temp, vertices[j], vertices[j + 1], vertices[j + 2]);
					
					for(var j = 0 ; j < vertices.length ; j += 3) {
						vec3.transformQuat(temp, temp, building.gridRotation);
						
						if(temp[0] < projectionSurfaceMin[0]) projectionSurfaceMin[0] = temp[0];
						if(temp[1] < projectionSurfaceMin[1]) projectionSurfaceMin[1] = temp[1];
						if(temp[2] < projectionSurfaceMin[2]) projectionSurfaceMin[2] = temp[2];
						
						if(temp[0] > projectionSurfaceMax[0]) projectionSurfaceMax[0] = temp[0];
						if(temp[1] > projectionSurfaceMax[1]) projectionSurfaceMax[1] = temp[1];
						if(temp[2] > projectionSurfaceMax[2]) projectionSurfaceMax[2] = temp[2];
					}
					
					// We don't need the surface to be shown
					building.model.meshes.splice(building.model.meshes.indexOf(surf));
				}
			}
			
			var projectionSurfaceSize = vec3.subtract(vec3.create(), projectionSurfaceMax, projectionSurfaceMin);
			var projectionSurfaceHalfSize = vec3.scale(vec3.create(), projectionSurfaceSize, 0.5);
			var projectionSurfaceMidPoint = vec3.add(vec3.create(), projectionSurfaceMin, projectionSurfaceSize);
			
			var ssSize = vec3.subtract(vec3.create(), building.spaceShip.maxBounds, building.spaceShip.minBounds);
			var maxSize = Math.max.apply(null, ssSize);
			
			vec3.scale(temp, ssSize, 0.5);
			var currentTarget = vec3.add(vec3.create(), building.spaceShip.minBounds, temp);
			var currentUnitSize = projectionSurfaceSize[ssSize.indexOf(maxSize)] / maxSize;
			
			building.refreshHologram = function() {
				// TODO hologram in [building.projectionSurfaceMin .. building.projectionSurfaceMax]
				// TODO + hologramEntity.regenerateCache();
			};
			
			var screenCanvas = document.createElement("canvas");
			screenCanvas.width  = imgTexture.width;
			screenCanvas.height = imgTexture.height;
			var screenContext = screenCanvas.getContext("2d");
			var screenTexture = Materials.setCanvasAsTexture(building.gl, screenCanvas, null);
			
			building.refreshScreen = function() {
				screenContext.drawImage(imgTexture, 0, 0);
				// TODO draw slider and selectors
				Materials.setCanvasAsTexture(building.gl, screenCanvas, screenTexture);
			};
			
			var startScreen = function(meshGroup, leftArrowDirection, rightArrowDirection) {
				var meshes = building.model.meshGroups[meshGroup];
				for(var i = 0 ; i < meshes.length ; i++) {
					meshes[i].texture = screenTexture
				}
				
				building.world.configurePickableContent(mesh, function(x, y, mouseUp) {
					if(mouseUp) {
						var index = (areas.width * Math.floor(y * areas.height) + Math.floor(x * areas.width)) * 4;
						var r = areas.data[index    ];
						var g = areas.data[index + 1];
						var b = areas.data[index + 2];
						var a = areas.data[index + 3];
						
						if(a != 255) return;
						
						if(r == 255 && g == 0) {
							if(b == 0) {
								// TODO Select this
								building.refreshScreen();
							} else {
								var group = b / 10;
								// TODO Select group
								building.refreshScreen();
							}
						} else if(r == 0 && g == 255) {
							var group = (b / 10);
							// TODO Assign group
							building.refreshScreen();
						} else if(r == 0 && g == 0) {
							var powerRate = b / 255;
							// TODO Set power rate
							building.refreshScreen();
						} else if(r == 255 && g == 255) {
							if(b == 200) { // Zoom -
								currentUnitSize /= zoomFactor;
							} else if(b == 210) { // Zoom +
								currentUnitSize *= zoomFactor;
							} else if(b == 255) {
								// TODO Set all off
							} else {
								if(b == 10) { // Up arrow
									vec3.transformQuat(temp, vec3.fromValues(0, 1, 0), building.gridRotation);
									vec3.add(currentTarget, currentTarget, temp);
								} else if(b == 20) { // Right arrow
									vec3.transformQuat(temp, rightArrowDirection, building.gridRotation);
									vec3.add(currentTarget, currentTarget, temp);
								} else if(b == 30) { // Down arrow
									vec3.transformQuat(temp, vec3.fromValues(0, -1, 0), building.gridRotation);
									vec3.add(currentTarget, currentTarget, temp);
								} else if(b == 40) { // Left arrow
									vec3.transformQuat(temp, leftArrowDirection, building.gridRotation);
									vec3.add(currentTarget, currentTarget, temp);
								}
								
								// Rounding position (the rotation can create unwanted decimals)
								currentTarget[0] = Math.round(currentTarget[0]);
								currentTarget[1] = Math.round(currentTarget[1]);
								currentTarget[2] = Math.round(currentTarget[2]);
							}
							
							building.refreshHologram();
						} else {
							return;
						}
					}
				}, true);
			};
			startScreen("front_screen", vec3.fromValues(-1, 0,  0), vec3.fromValues( 1, 0,  0));
			startScreen("right_screen", vec3.fromValues( 0, 0,  1), vec3.fromValues( 0, 0, -1));
			startScreen("back_screen",  vec3.fromValues( 1, 0,  0), vec3.fromValues(-1, 0,  0));
			startScreen("left_screen",  vec3.fromValues( 0, 0, -1), vec3.fromValues( 0, 0,  1));
			
			building.refreshHologram();
			building.refreshScreen();
		}
		
		building.model.regenerateCache();
		
		var hitBox = HitBox.createFromModel(building.model);
		building.hitBoxes.push(hitBox);
		building.spaceShip.physics.add(hitBox);
	};
})();




