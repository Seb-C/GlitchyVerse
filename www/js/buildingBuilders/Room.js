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

/**
 * Creates a standard room. See Entity for other parameters
 * @param {definition} Object Containing the definition of the room, with attributes : 
 *               - unitSize : Array(3) Vector(3), size of each unit (the smallest possible room size)
 *               - edgeSize : The side of the room edges
 *               - position : Position in the SpaceShip (room units)
 *               - size     : Array(3) Vector(3) or integers, size of the room in unitSize
 *               - gaps     : An object defining the gaps (for windows or doors for example) of each face.
 *                            Keys of this objects can be : front, back, left, right, top or bottom (all relative to the origin rotation).
 *                            Values are are Array(Array(2)), a list of Vector(2), position of gaps. Positions are defined with 2D coordinates 
 *                            (beginning with [0, 0], which is the top left point), saw from the inside of the room.
 */
Building.builders.Room = function(building, state) {
	// Loading required textures
	Materials.loadMtl("materials/main.mtl");
	
	var wallChangeDuration = 1000;
	
	/**
	 * Regenerates all meshes, based on the known definition and the gaps listed in the SpaceShip object.
	 */
	building.regenerateMeshes = function() {
		var oldHitBoxes = null;
		if(building.hitBoxes.length > 0) {
			oldHitBoxes = building.hitBoxes;
			building.hitBoxes = [];
		}
		
		var unitSize = building.spaceShip.roomUnitSize[0]; // TODO change in spaceship and everywhere from a vec3 to a float
		var bSize = building.gridSize;
		var bPos  = building.gridPosition;
		
		var material_METAL_BOLT = Materials.get("METAL_BOLT");
		var material_METAL_WALL = Materials.get("METAL_WALL");
		
		var gaps = {
			front : [],
			back  : [],
			left  : [],
			right : [],
			ceil  : [],
			ground: []
		};
		for(var k in building.spaceShip.gapBuildings) {
			var gap = building.spaceShip.gapBuildings[k];
			
			var side = null;
			var pos = null;
			if(gap.gridPosition[0] % 1 != 0) { // Left or right
				// Checking that Y and Z points are in this room
				if(
					   gap.gridPosition[1] >= bPos[1] && gap.gridPosition[1] < bPos[1] + bSize[1]
					&& gap.gridPosition[2] >= bPos[2] && gap.gridPosition[2] < bPos[2] + bSize[2]
				) {
					if(Math.ceil(gap.gridPosition[0]) == bPos[0]) {
						side = "left";
						pos = [
							(bPos[2] + bSize[2] - 1) - gap.gridPosition[2],
							(bPos[1] + bSize[1] - 1) - gap.gridPosition[1]
						];
					} else if(Math.floor(gap.gridPosition[0]) == bPos[0] + bSize[0] - 1) {
						side = "right";
						pos = [
							gap.gridPosition[2] - bPos[2],
							(bPos[1] + bSize[1] - 1) - gap.gridPosition[1]
						];
					}
				}
			} else if(gap.gridPosition[1] % 1 != 0) { // Ground or ceil
				// Checking that X and Z points are in this room
				if(
					   gap.gridPosition[0] >= bPos[0] && gap.gridPosition[0] < bPos[0] + bSize[0]
					&& gap.gridPosition[2] >= bPos[2] && gap.gridPosition[2] < bPos[2] + bSize[2]
				) {
					if(Math.floor(gap.gridPosition[1]) == bPos[1] + bSize[1] - 1) {
						side = "ceil";
						pos = [
							(bPos[0] + bSize[0] - 1) - gap.gridPosition[0],
							gap.gridPosition[2] - bPos[2]
						];
					} else if(Math.ceil(gap.gridPosition[1]) == bPos[1]) {
						side = "ground";
						pos = [
							(bPos[0] + bSize[0] - 1) - gap.gridPosition[0],
							(bPos[2] + bSize[2] - 1) - gap.gridPosition[2]
						];
					}
				}
				
				// TODO start faces with ground instead of front, to synchronize it with identity quaternion ?
				
			} else if(gap.gridPosition[2] % 1 != 0) { // Front or back
				// Checking that X and Y points are in this room
				if(
					   gap.gridPosition[0] >= bPos[0] && gap.gridPosition[0] < bPos[0] + bSize[0]
					&& gap.gridPosition[1] >= bPos[1] && gap.gridPosition[1] < bPos[1] + bSize[1]
				) {
					if(Math.ceil(gap.gridPosition[2]) == bPos[2]) {
						side = "back";
						pos = [
							gap.gridPosition[0] - bPos[0],
							(bPos[1] + bSize[1] - 1) - gap.gridPosition[1]
						];
					} else if(Math.floor(gap.gridPosition[2]) == bPos[2] + bSize[2] - 1) {
						side = "front";
						pos = [
							(bPos[0] + bSize[0] - 1) - gap.gridPosition[0],
							(bPos[1] + bSize[1] - 1) - gap.gridPosition[1]
						];
					}
				}
			}
			
			if(side != null) {
				if(!gaps[side]) gaps[side] = Array();
				gaps[side].push(pos);
			}
		}
		
		// Misc dimensions
		var edgeSize = building.spaceShip.edgeSize;
		
		// Walls positions
		var x2 = unitSize * bSize[0] / 2;
		var y2 = unitSize * bSize[1] / 2;
		var z2 = unitSize * bSize[2] / 2;
		var x1 = x2 - edgeSize;
		var y1 = y2 - edgeSize;
		var z1 = z2 - edgeSize;
		
		// Defining meshes
		var meshes = [];
		
		// Inner & outer walls
		var self = this;
		var createFace = function(faceGaps, zCoord1, coord2, xRotation, yRotation, width, height, walkingBuildingRotation, absPos, absPosXIncrement, absPosYIncrement, buildAngleDelta) {
			var absPos1 = vec3.clone(absPos);
			var absPos2 = vec3.clone(absPos);
			
			for(var x = 0 ; x < width ; x++) {
				for(var y = 0 ; y < height ; y++) {
					var isGap = false;
					for(var i = 0 ; i < faceGaps.length ; i++) {
						if(faceGaps[i][0] == x && faceGaps[i][1] == y) {
							isGap = true;
							break;
						}
					}
					
					if(isGap) {
						// For parts where there are gaps, we have to draw just the frame
						for(var i = 0 ; i < faceGaps.length ; i++) { // TODO remove this loop ?
							var s = faceGaps[i];
							
							// Calculating texture bounds
							var textureBounds = [0, 0, unitSize, unitSize];
							if(s[0]     ==     0 ) textureBounds[0] += edgeSize;
							if(s[1]     ==     0 ) textureBounds[1] += edgeSize;
							if(s[0] + 1 == width ) textureBounds[2] -= edgeSize;
							if(s[1] + 1 == height) textureBounds[3] -= edgeSize;
							if(s[1] % 2 == 1) {
								textureBounds[1] += 0.5;
								textureBounds[3] += 0.5;
							}
							
							// Sides addition
							var leftAdd   = s[0] == 0 ? -edgeSize : 0;
							var topAdd    = s[1] == 0 ? -edgeSize : 0;
							var rightAdd  = s[0] + 1 == width  ? edgeSize : 0;
							var bottomAdd = s[1] + 1 == height ? edgeSize : 0;
							
							if(s[1] > 0) {
								// Top
								var texture = [
									textureBounds[0], textureBounds[1],
									textureBounds[2], textureBounds[1],
									textureBounds[2], textureBounds[1] + edgeSize,
									textureBounds[0], textureBounds[1] + edgeSize
								];
								
								var hull = new Mesh(material_METAL_BOLT, [
									coord2[0] -  s[0]      * unitSize + leftAdd,  coord2[1] - s[1] * unitSize,            coord2[2],
									coord2[0] - (s[0] + 1) * unitSize + rightAdd, coord2[1] - s[1] * unitSize,            coord2[2],
									coord2[0] - (s[0] + 1) * unitSize + rightAdd, coord2[1] - s[1] * unitSize - edgeSize, coord2[2],
									coord2[0] -  s[0]      * unitSize + leftAdd,  coord2[1] - s[1] * unitSize - edgeSize, coord2[2]
								], [0, 0, 1], texture);
								var wall = new Mesh(material_METAL_WALL, [
									coord2[0] -  s[0]      * unitSize + leftAdd,  coord2[1] - s[1] * unitSize,            zCoord1,
									coord2[0] - (s[0] + 1) * unitSize + rightAdd, coord2[1] - s[1] * unitSize,            zCoord1,
									coord2[0] - (s[0] + 1) * unitSize + rightAdd, coord2[1] - s[1] * unitSize - edgeSize, zCoord1,
									coord2[0] -  s[0]      * unitSize + leftAdd,  coord2[1] - s[1] * unitSize - edgeSize, zCoord1
								], [0, 0, -1], texture);
								
								meshes.push(hull);
								meshes.push(wall);
								
								if(yRotation && yRotation != 0) {
									hull.rotateY(yRotation);
									wall.rotateY(yRotation);
								}
								if(xRotation && xRotation != 0) {
									hull.rotateX(xRotation);
									wall.rotateX(xRotation);
								}
							}
							if(s[1] < height - 1) {
								// Bottom
								var texture = [
									textureBounds[0], textureBounds[3] + edgeSize,
									textureBounds[2], textureBounds[3] + edgeSize,
									textureBounds[2], textureBounds[3],
									textureBounds[0], textureBounds[3]
								];
								
								var hull = new Mesh(material_METAL_BOLT, [
									coord2[0] -  s[0]      * unitSize + leftAdd,  coord2[1] - (s[1] + 1) * unitSize + edgeSize, coord2[2],
									coord2[0] - (s[0] + 1) * unitSize + rightAdd, coord2[1] - (s[1] + 1) * unitSize + edgeSize, coord2[2],
									coord2[0] - (s[0] + 1) * unitSize + rightAdd, coord2[1] - (s[1] + 1) * unitSize,            coord2[2],
									coord2[0] -  s[0]      * unitSize + leftAdd,  coord2[1] - (s[1] + 1) * unitSize,            coord2[2]
								], [0, 0, 1], texture);
								var wall = new Mesh(material_METAL_WALL, [
									coord2[0] -  s[0]      * unitSize + leftAdd,  coord2[1] - (s[1] + 1) * unitSize + edgeSize, zCoord1,
									coord2[0] - (s[0] + 1) * unitSize + rightAdd, coord2[1] - (s[1] + 1) * unitSize + edgeSize, zCoord1,
									coord2[0] - (s[0] + 1) * unitSize + rightAdd, coord2[1] - (s[1] + 1) * unitSize,            zCoord1,
									coord2[0] -  s[0]      * unitSize + leftAdd,  coord2[1] - (s[1] + 1) * unitSize,            zCoord1
								], [0, 0, -1], texture);
								
								meshes.push(hull);
								meshes.push(wall);
								
								if(yRotation && yRotation != 0) {
									hull.rotateY(yRotation);
									wall.rotateY(yRotation);
								}
								if(xRotation && xRotation != 0) {
									hull.rotateX(xRotation);
									wall.rotateX(xRotation);
								}
							}
							if(s[0] > 0) {
								// Left
								var texture = [
									textureBounds[0],            textureBounds[1],
									textureBounds[0] + edgeSize, textureBounds[1],
									textureBounds[0] + edgeSize, textureBounds[3],
									textureBounds[0],            textureBounds[3]
								];
								
								var hull = new Mesh(material_METAL_BOLT, [
									coord2[0] - s[0] * unitSize,            coord2[1] -  s[1]      * unitSize + topAdd,    coord2[2],
									coord2[0] - s[0] * unitSize - edgeSize, coord2[1] -  s[1]      * unitSize + topAdd,    coord2[2],
									coord2[0] - s[0] * unitSize - edgeSize, coord2[1] - (s[1] + 1) * unitSize + bottomAdd, coord2[2],
									coord2[0] - s[0] * unitSize,            coord2[1] - (s[1] + 1) * unitSize + bottomAdd, coord2[2]
								], [0, 0, 1], texture);
								var wall = new Mesh(material_METAL_WALL, [
									coord2[0] - s[0] * unitSize,            coord2[1] -  s[1]      * unitSize + topAdd,    zCoord1,
									coord2[0] - s[0] * unitSize - edgeSize, coord2[1] -  s[1]      * unitSize + topAdd,    zCoord1,
									coord2[0] - s[0] * unitSize - edgeSize, coord2[1] - (s[1] + 1) * unitSize + bottomAdd, zCoord1,
									coord2[0] - s[0] * unitSize,            coord2[1] - (s[1] + 1) * unitSize + bottomAdd, zCoord1
								], [0, 0, -1], texture);
								
								meshes.push(hull);
								meshes.push(wall);
								
								if(yRotation && yRotation != 0) {
									hull.rotateY(yRotation);
									wall.rotateY(yRotation);
								}
								if(xRotation && xRotation != 0) {
									hull.rotateX(xRotation);
									wall.rotateX(xRotation);
								}
							}
							if(s[0] < width - 1) {
								// Right
								var texture = [
									textureBounds[2] - edgeSize, textureBounds[1],
									textureBounds[2],            textureBounds[1],
									textureBounds[2],            textureBounds[3],
									textureBounds[2] - edgeSize, textureBounds[3]
								];
								
								var hull = new Mesh(material_METAL_BOLT, [
									coord2[0] - (s[0] + 1) * unitSize + edgeSize, coord2[1] -  s[1]      * unitSize + topAdd,    coord2[2],
									coord2[0] - (s[0] + 1) * unitSize,            coord2[1] -  s[1]      * unitSize + topAdd,    coord2[2],
									coord2[0] - (s[0] + 1) * unitSize,            coord2[1] - (s[1] + 1) * unitSize + bottomAdd, coord2[2],
									coord2[0] - (s[0] + 1) * unitSize + edgeSize, coord2[1] - (s[1] + 1) * unitSize + bottomAdd, coord2[2]
								], [0, 0, 1], texture);
								var wall = new Mesh(material_METAL_WALL, [
									coord2[0] - (s[0] + 1) * unitSize + edgeSize, coord2[1] -  s[1]      * unitSize + topAdd,    zCoord1,
									coord2[0] - (s[0] + 1) * unitSize,            coord2[1] -  s[1]      * unitSize + topAdd,    zCoord1,
									coord2[0] - (s[0] + 1) * unitSize,            coord2[1] - (s[1] + 1) * unitSize + bottomAdd, zCoord1,
									coord2[0] - (s[0] + 1) * unitSize + edgeSize, coord2[1] - (s[1] + 1) * unitSize + bottomAdd, zCoord1
								], [0, 0, -1], texture);
								
								meshes.push(hull);
								meshes.push(wall);
								
								if(yRotation && yRotation != 0) {
									hull.rotateY(yRotation);
									wall.rotateY(yRotation);
								}
								if(xRotation && xRotation != 0) {
									hull.rotateX(xRotation);
									wall.rotateX(xRotation);
								}
							}
						}
					} else {
						// Meshes for faces parts where there are not gaps
						var textureBounds = [0, 0, unitSize, unitSize];
						if(x == 0) textureBounds[0] += edgeSize;
						if(y == 0) textureBounds[1] += edgeSize;
						if(x + 1 == 1) textureBounds[2] -= edgeSize;
						if(y + 1 == 1) textureBounds[3] -= edgeSize;
						if(y % 2 == 1) {
							textureBounds[1] += 0.5;
							textureBounds[3] += 0.5;
						}
						
						textureBounds = [
							textureBounds[0], textureBounds[1],
							textureBounds[2], textureBounds[1],
							textureBounds[2], textureBounds[3],
							textureBounds[0], textureBounds[3]
						];
						
						// Sides additions
						var leftAdd   = x == 0 ? edgeSize : 0;
						var topAdd    = y == 0 ? edgeSize : 0;
						var rightAdd  = x + 1 == width  ? edgeSize : 0;
						var bottomAdd = y + 1 == height ? edgeSize : 0;
						
						// Exterior (face), hull
						var hull = new Mesh(material_METAL_BOLT, [
							coord2[0] -  x      * unitSize - leftAdd,  coord2[1] -  y      * unitSize - topAdd,    coord2[2],
							coord2[0] - (x + 1) * unitSize + rightAdd, coord2[1] -  y      * unitSize - topAdd,    coord2[2],
							coord2[0] - (x + 1) * unitSize + rightAdd, coord2[1] - (y + 1) * unitSize + bottomAdd, coord2[2],
							coord2[0] -  x      * unitSize - leftAdd,  coord2[1] - (y + 1) * unitSize + bottomAdd, coord2[2]
						], [0, 0, 1], textureBounds);
						
						// Interior (Wall)
						var wall = new Mesh(material_METAL_WALL, [
							coord2[0] -  x      * unitSize - leftAdd,  coord2[1] -  y      * unitSize - topAdd,    zCoord1,
							coord2[0] - (x + 1) * unitSize + rightAdd, coord2[1] -  y      * unitSize - topAdd,    zCoord1,
							coord2[0] - (x + 1) * unitSize + rightAdd, coord2[1] - (y + 1) * unitSize + bottomAdd, zCoord1,
							coord2[0] -  x      * unitSize - leftAdd,  coord2[1] - (y + 1) * unitSize + bottomAdd, zCoord1
						], [0, 0, -1], textureBounds);
						
						(function() {
							var wallPositionInSpaceShip = vec3.clone(absPos2);
							
							var buildOnWallDirection = vec3.fromValues(0, 1, 0);
							vec3.transformQuat(buildOnWallDirection, buildOnWallDirection, walkingBuildingRotation);
							buildOnWallDirection[0] = Math.round(buildOnWallDirection[0]);
							buildOnWallDirection[1] = Math.round(buildOnWallDirection[1]);
							buildOnWallDirection[2] = Math.round(buildOnWallDirection[2]);
							var buildOnHullDirection = vec3.clone(buildOnWallDirection);
							vec3.negate(buildOnHullDirection, buildOnHullDirection);
							
							var walkingRotationOnHull = quat.invert(quat.create(), walkingBuildingRotation);
							
							building.world.configurePickableContent(hull, function(pickX, pickY) {
								if(building.world.designer.spaceShip == building.spaceShip) {
									var yAngle = Math.atan2((1 - pickX) - 0.5, (1 - pickY) - 0.5) + buildAngleDelta;
									building.world.designer.setPickedPosition(wallPositionInSpaceShip, buildOnHullDirection, walkingRotationOnHull, yAngle);
								}
							}, true);
							building.world.configurePickableContent(wall, function(pickX, pickY) {
								if(building.world.designer.spaceShip == building.spaceShip) {
									var yAngle = Math.atan2(pickX - 0.5, pickY - 0.5) + buildAngleDelta;
									building.world.designer.setPickedPosition(wallPositionInSpaceShip, buildOnWallDirection, walkingBuildingRotation, yAngle);
								}
							}, true);
						})();
						
						// TODO hitboxes on windows and doors frames
						
						var hitBoxesMargin = edgeSize * 0.98;
						
						var hitBox = new HitBox(
							vec3.fromValues(
								coord2[0] - x * unitSize + hitBoxesMargin,
								coord2[1] - y * unitSize + hitBoxesMargin,
								coord2[2]
							), vec3.fromValues(
								coord2[0] - (x + 1) * unitSize - hitBoxesMargin,
								coord2[1] - (y + 1) * unitSize - hitBoxesMargin,
								zCoord1
							)
						);
						hitBox.onCollide = function(hb) {
							if(!hb.building.isFrozen) {
								var wallRotation = quat.create();
								quat.rotateX(wallRotation, wallRotation, xRotation);
								quat.rotateY(wallRotation, wallRotation, yRotation);
								quat.invert(wallRotation, wallRotation);
								
								var buildingRotation = hb.building.rotationInSpaceShip;
								
								var r = quat.create();
								quat.invert(r, buildingRotation);
								quat.multiply(r, r, wallRotation);
								
								var distance = r[3]*r[3] - r[0]*r[0] - r[1]*r[1] + r[2]*r[2];
								if(distance < -0.5) { // The player is looking to the wall and going forward to it
									var beginTime = TimerManager.lastUpdateTimeStamp;
									
									var initialRotation = quat.clone(hb.building.gridRotation);
									var targetRotation = quat.clone(walkingBuildingRotation);
									
									// Applying required Y rotation to the look quaternion
									var targetLook = quat.create();
									quat.invert(targetLook, initialRotation);
									quat.multiply(targetLook, targetRotation, targetLook);
									targetLook[0] = 0;
									targetLook[2] = 0;
									quat.normalize(targetLook, targetLook);
									quat.multiply(targetLook, hb.building.look, targetLook);
									
									var animationBegin = quat.clone(hb.building.rotationInSpaceShip);
									var animationEnd = quat.create();
									quat.multiply(animationEnd, targetRotation, targetLook);
									quat.identity(hb.building.look);
									
									var animationTimer = new Timer(function() {
										var currentTime = TimerManager.lastUpdateTimeStamp;
										var animationRate = (currentTime - beginTime) / wallChangeDuration;
										if(animationRate >= 1) {
											hb.building.isFrozen = false;
											animationTimer.unregister();
											hb.building.gridRotation = targetRotation;
											hb.building.look         = targetLook;
										} else {
											// Changing rotation of the building
											quat.slerp(hb.building.gridRotation, animationBegin, animationEnd, animationRate);
										}
										
										hb.building.refreshPositionAndRotationInSpaceShip();
									}, 0, true);
									hb.building.isFrozen = true;
								}
							}
						};
						building.hitBoxes.push(hitBox);
						
						meshes.push(hull);
						meshes.push(wall);
						
						if(yRotation && yRotation != 0) {
							hull.rotateY(yRotation);
							wall.rotateY(yRotation);
							
							// Rotating hitbox
							var cos = Math.cos(yRotation);
							var sin = Math.sin(yRotation);
							var minX = hitBox.min[0] * cos - hitBox.min[2] * sin;
							var minZ = hitBox.min[2] * cos + hitBox.min[0] * sin;
							hitBox.min[0] = minX;
							hitBox.min[2] = minZ;
							var maxX = hitBox.max[0] * cos - hitBox.max[2] * sin;
							var maxZ = hitBox.max[2] * cos + hitBox.max[0] * sin;
							hitBox.max[0] = maxX;
							hitBox.max[2] = maxZ;
						}
						if(xRotation && xRotation != 0) {
							hull.rotateX(xRotation);
							wall.rotateX(xRotation);
							
							// Rotating hitbox
							var cos = Math.cos(xRotation);
							var sin = Math.sin(xRotation);
							
							var minY = hitBox.min[1] * cos + hitBox.min[2] * sin;
							var minZ = hitBox.min[2] * cos - hitBox.min[1] * sin;
							hitBox.min[1] = minY;
							hitBox.min[2] = minZ;
							var maxY = hitBox.max[1] * cos + hitBox.max[2] * sin;
							var maxZ = hitBox.max[2] * cos - hitBox.max[1] * sin;
							hitBox.max[1] = maxY;
							hitBox.max[2] = maxZ;
						}
					}
					
					vec3.add(absPos2, absPos2, absPosYIncrement);
				}
				
				vec3.add(absPos1, absPos1, absPosXIncrement);
				vec3.copy(absPos2, absPos1);
			}
		};
		
		// Faces rotations
		var playerRot = {};
		
		playerRot.front = quat.create();
		quat.rotateX(playerRot.front, playerRot.front, -Math.PI / 2);
		
		playerRot.back = quat.create();
		quat.rotateX(playerRot.back, playerRot.back, Math.PI / 2);
		
		playerRot.left = quat.create();
		quat.rotateZ(playerRot.left, playerRot.left, -Math.PI / 2);
		
		playerRot.right = quat.create();
		quat.rotateZ(playerRot.right, playerRot.right, Math.PI / 2);
		
		playerRot.ground = quat.create();
		
		playerRot.ceil = quat.create();
		quat.rotateX(playerRot.ceil, playerRot.ceil, Math.PI);
		quat.invert(playerRot.ceil, playerRot.ceil);
		
		// Creating faces
		createFace(gaps.front,  z1, [x2, y2, z2],  0,            0,           bSize[0], bSize[1], playerRot.front , [bPos[0] + bSize[0] - 1,   bPos[1] + bSize[1] - 1,   bPos[2] + bSize[2] - 0.5], [-1,  0,  0], [ 0, -1,  0],            0);
		createFace(gaps.back,   z1, [x2, y2, z2],  0,           -Math.PI,     bSize[0], bSize[1], playerRot.back  , [bPos[0],                  bPos[1] + bSize[1] - 1,   bPos[2] - 0.5           ], [+1,  0,  0], [ 0, -1,  0],  Math.PI    );
		createFace(gaps.left,   x1, [z2, y2, x2],  0,            Math.PI / 2, bSize[2], bSize[1], playerRot.left  , [bPos[0] - 0.5,            bPos[1] + bSize[1] - 1,   bPos[2] + bSize[2] - 1  ], [ 0,  0, -1], [ 0, -1,  0], -Math.PI / 2);
		createFace(gaps.right,  x1, [z2, y2, x2],  0,           -Math.PI / 2, bSize[2], bSize[1], playerRot.right , [bPos[0] + bSize[0] - 0.5, bPos[1] + bSize[1] - 1,   bPos[2]                 ], [ 0,  0, +1], [ 0, -1,  0],  Math.PI / 2);
		createFace(gaps.ground, y1, [x2, z2, y2], -Math.PI / 2,  0,           bSize[0], bSize[2], playerRot.ground, [bPos[0] + bSize[0] - 1,   bPos[1] - 0.5,            bPos[2] + bSize[2] - 1  ], [-1,  0,  0], [ 0,  0, -1],            0);
		createFace(gaps.ceil,   y1, [x2, z2, y2],  Math.PI / 2,  0,           bSize[0], bSize[2], playerRot.ceil  , [bPos[0] + bSize[0] - 1,   bPos[1] + bSize[1] - 0.5, bPos[2]                 ], [-1,  0,  0], [ 0,  0, +1],            0);
		
		// Outer diagonals top
		meshes.push(new Mesh(material_METAL_BOLT, [
			-x1,  y2,  z1,
			 x1,  y2,  z1,
			 x1,  y1,  z2,
			-x1,  y1,  z2
		], [0, 1, 1])); // Front top
		meshes.push(new Mesh(material_METAL_BOLT, [
			 x1,  y2,  z1,
			 x1,  y2, -z1,
			 x2,  y1, -z1,
			 x2,  y1,  z1
		], [1, 1, 0])); // Right top
		meshes.push(new Mesh(material_METAL_BOLT, [
			 x1,  y2, -z1,
			-x1,  y2, -z1,
			-x1,  y1, -z2,
			 x1,  y1, -z2
		], [0, 1, -1])); // Back top
		meshes.push(new Mesh(material_METAL_BOLT, [
			-x1,  y2, -z1,
			-x1,  y2,  z1,
			-x2,  y1,  z1,
			-x2,  y1, -z1
		], [-1, 1, 0])); // Left top
		
		// Outer diagonals sides
		meshes.push(new Mesh(material_METAL_BOLT, [
			-x2, -y1,  z1,
			-x2,  y1,  z1,
			-x1,  y1,  z2,
			-x1, -y1,  z2
		], [-1, 0, 1])); // Front left
		meshes.push(new Mesh(material_METAL_BOLT, [
			-x1, -y1, -z2,
			-x1,  y1, -z2,
			-x2,  y1, -z1,
			-x2, -y1, -z1
		], [-1, 0, -1])); // Left back
		meshes.push(new Mesh(material_METAL_BOLT, [
			 x2, -y1, -z1,
			 x2,  y1, -z1,
			 x1,  y1, -z2,
			 x1, -y1, -z2
		], [1, 0, -1])); // Back right
		meshes.push(new Mesh(material_METAL_BOLT, [
			 x1, -y1,  z2,
			 x1,  y1,  z2,
			 x2,  y1,  z1,
			 x2, -y1,  z1
		], [1, 0, 1])); // Right front
		
		// Outer diagonals bottom
		meshes.push(new Mesh(material_METAL_BOLT, [
			 x1, -y2,  z1,
			-x1, -y2,  z1,
			-x1, -y1,  z2,
			 x1, -y1,  z2
		], [0, -1, 1])); // Front bottom
		meshes.push(new Mesh(material_METAL_BOLT, [
			-x1, -y2,  z1,
			-x1, -y2, -z1,
			-x2, -y1, -z1,
			-x2, -y1,  z1
		], [-1, -1, 0])); // Left bottom
		meshes.push(new Mesh(material_METAL_BOLT, [
			-x1, -y2, -z1,
			 x1, -y2, -z1,
			 x1, -y1, -z2,
			-x1, -y1, -z2
		], [0, -1, -1])); // Back bottom
		meshes.push(new Mesh(material_METAL_BOLT, [
			 x1, -y2, -z1,
			 x1, -y2,  z1,
			 x2, -y1,  z1,
			 x2, -y1, -z1
		], [1, -1, 0])); // Right bottom
		
		// Outer corners top
		meshes.push(new Mesh(material_METAL_BOLT, [
			-x2,  y1,  z1,
			-x1,  y2,  z1,
			-x1,  y1,  z2
		], [-1, 1, 1])); // Front left top
		meshes.push(new Mesh(material_METAL_BOLT, [
			-x1,  y1, -z2,
			-x1,  y2, -z1,
			-x2,  y1, -z1
		], [-1, 1, -1])); // Left back top
		meshes.push(new Mesh(material_METAL_BOLT, [
			 x2,  y1, -z1,
			 x1,  y2, -z1,
			 x1,  y1, -z2
		], [1, 1, -1])); // Back right top
		meshes.push(new Mesh(material_METAL_BOLT, [
			 x1,  y1,  z2,
			 x1,  y2,  z1,
			 x2,  y1,  z1
		], [1, 1, 1])); // Right front top
		
		// Outer corners bottom
		meshes.push(new Mesh(material_METAL_BOLT, [
			-x1, -y2,  z1,
			-x2, -y1,  z1,
			-x1, -y1,  z2
		], [-1, -1, 1])); // Front left bottom
		meshes.push(new Mesh(material_METAL_BOLT, [
			-x1, -y2, -z1,
			-x1, -y1, -z2,
			-x2, -y1, -z1
		], [-1, -1, -1])); // Left back bottom
		meshes.push(new Mesh(material_METAL_BOLT, [
			 x1, -y2, -z1,
			 x2, -y1, -z1,
			 x1, -y1, -z2
		], [1, -1, -1])); // Back right bottom
		meshes.push(new Mesh(material_METAL_BOLT, [
			 x1, -y2,  z1,
			 x1, -y1,  z2,
			 x2, -y1,  z1
		], [1, -1, 1])); // Right front bottom
					
		building.model.meshes = meshes;
		building.model.regenerateCache();
		
		// No hitboxes if there are buildings on each wall
		for(var i = 0 ; i < building.hitBoxes.length ; i++) {
			building.hitBoxes[i].linkToBuilding(building);
		}
		if(building.hitBoxes.length > 0) building.spaceShip.physics.add(building.hitBoxes);
		if(oldHitBoxes != null) building.spaceShip.physics.remove(oldHitBoxes);
	};
	
	building.regenerateMeshes();
	
	var distance = Math.max.apply(Math, [
		building.spaceShip.roomUnitSize[0] * building.gridSize[0] - (building.spaceShip.edgeSize / 2),
		building.spaceShip.roomUnitSize[1] * building.gridSize[1] - (building.spaceShip.edgeSize / 2),
		building.spaceShip.roomUnitSize[2] * building.gridSize[2] - (building.spaceShip.edgeSize / 2)
	]);
	building.lights.push(new Light(vec3.clone(building.gridPosition), [1, 1, 1], distance, true, 0.8));
	
	building.world.add(building.lights);
};
